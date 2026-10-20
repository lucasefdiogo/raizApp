package com.luxthorapps.rootora

import java.io.File
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Runs the SAME fixture as Jest (src/domain/__fixtures__/avisoBloqueio.json)
 * against the Kotlin mirror, so AvisoDesligamentoMaquina and
 * domain/avisoBloqueio.ts cannot diverge. Instants are built in the JVM
 * default time zone, as Jest uses the process one.
 */
class AvisoDesligamentoMaquinaTest {
  private fun carregarFixtures(): JSONObject {
    // Gradle runs tests with working dir = android/app.
    val arquivo = File("../../src/domain/__fixtures__/avisoBloqueio.json")
    assertTrue("fixture not found at ${arquivo.absolutePath}", arquivo.exists())
    return JSONObject(arquivo.readText())
  }

  // Fixture "mes" is 1-12; Calendar months are 0-11.
  private fun instante(o: JSONObject): Long {
    val c = Calendar.getInstance()
    c.clear()
    c.set(o.getInt("ano"), o.getInt("mes") - 1, o.getInt("dia"), o.getInt("hora"), o.getInt("minuto"), 0)
    return c.timeInMillis
  }

  private fun instanteOuNulo(o: JSONObject, chave: String): Long? =
    if (o.isNull(chave)) null else instante(o.getJSONObject(chave))

  private fun ordens(arr: JSONArray): List<Int> = (0 until arr.length()).map { arr.getInt(it) }

  @Test
  fun `CA-01 horarios e textos do 1o lembrete batem com a fixture`() {
    val f = carregarFixtures()
    val casos = f.getJSONArray("lembretes")
    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val nome = caso.getString("nome")
      val esperado = caso.getJSONArray("esperado")
      val (primeiro, _) = AvisoDesligamentoMaquina.horariosLembretes(instante(caso.getJSONObject("desligadoEm")))
      assertEquals("CA-01 horario: $nome", instante(esperado.getJSONObject(0).getJSONObject("em")), primeiro)
    }
    val t = f.getJSONArray("textos").getJSONObject(0)
    val texto = AvisoDesligamentoMaquina.textoLembrete(t.getInt("ordem"))
    assertEquals("CA-01 titulo", t.getString("titulo"), texto.titulo)
    assertEquals("CA-01 corpo", t.getString("corpo"), texto.corpo)
  }

  @Test
  fun `CA-02 horario e texto do 2o lembrete batem com a fixture`() {
    val f = carregarFixtures()
    val casos = f.getJSONArray("lembretes")
    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val nome = caso.getString("nome")
      val esperado = caso.getJSONArray("esperado")
      val (_, segundo) = AvisoDesligamentoMaquina.horariosLembretes(instante(caso.getJSONObject("desligadoEm")))
      assertEquals("CA-02 horario: $nome", instante(esperado.getJSONObject(1).getJSONObject("em")), segundo)
    }
    val t = f.getJSONArray("textos").getJSONObject(1)
    val texto = AvisoDesligamentoMaquina.textoLembrete(t.getInt("ordem"))
    assertEquals("CA-02 titulo", t.getString("titulo"), texto.titulo)
    assertEquals("CA-02 corpo", t.getString("corpo"), texto.corpo)
  }

  @Test
  fun `CA-03 religado antes das 09h nao deixa lembrete agendavel`() {
    val casos = carregarFixtures().getJSONArray("agendaveis")
    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val nome = caso.getString("nome")
      val resultado = AvisoDesligamentoMaquina.lembretesAgendaveis(
        instante(caso.getJSONObject("desligadoEm")),
        instanteOuNulo(caso, "religadoEm"),
        instante(caso.getJSONObject("agora")),
      )
      assertEquals("CA-03 agendaveis: $nome", ordens(caso.getJSONArray("esperadoOrdens")), resultado.map { it.ordem })
    }
    // Scheduled instants must match the 09:00 times of horariosLembretes.
    val desligado = instante(carregarFixtures().getJSONArray("agendaveis").getJSONObject(0).getJSONObject("desligadoEm"))
    val (p, s) = AvisoDesligamentoMaquina.horariosLembretes(desligado)
    val todos = AvisoDesligamentoMaquina.lembretesAgendaveis(desligado, null, desligado)
    assertEquals("CA-03 instantes", listOf(p, s), todos.map { it.em })
  }

  @Test
  fun `CA-06 decisao de exibir bate com a fixture`() {
    val casos = carregarFixtures().getJSONArray("exibir")
    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val c = CondicoesExibicao(
        servicoDesligado = caso.getBoolean("servicoDesligado"),
        temRegrasBloqueio = caso.getBoolean("temRegrasBloqueio"),
        jaAtivadoAlgumaVez = caso.getBoolean("jaAtivadoAlgumaVez"),
        notificacoesAtivas = caso.getBoolean("notificacoesAtivas"),
      )
      assertEquals("CA-06 exibir: ${caso.getString("nome")}", caso.getBoolean("esperado"), AvisoDesligamentoMaquina.deveExibirLembrete(c))
    }
  }

  @Test
  fun `CA-07 decisao de registrar desligamento na abertura bate com a fixture`() {
    val casos = carregarFixtures().getJSONArray("registrarNaAbertura")
    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val ultimo = if (caso.isNull("ultimoEvento")) null else caso.getString("ultimoEvento")
      assertEquals(
        "CA-07 registrar: ${caso.getString("nome")}",
        caso.getBoolean("esperado"),
        AvisoDesligamentoMaquina.deveRegistrarDesligamentoNaAbertura(caso.getBoolean("servicoDesligado"), ultimo),
      )
    }
  }
}
