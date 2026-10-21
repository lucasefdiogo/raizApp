package com.luxthorapps.rootora

import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Roda as MESMAS fixtures do Jest (src/domain/__fixtures__/saldoBloqueio.json)
 * contra o Kotlin — é o que garante que SaldoBloqueioMaquina e
 * domain/saldoBloqueio.ts não divergem.
 */
class SaldoBloqueioMaquinaTest {
  // Cada caso das fixtures pertence a um único critério (primeiro que casar).
  private fun grupoDoCaso(nome: String): String =
    when {
      // HU-05: casos novos, em grupos próprios para não colidir com os critérios da HU-04.
      nome.startsWith("acesso rapido libera 2 minutos") -> "HU05-CA-01"
      nome.startsWith("acesso rapido no cooldown") -> "HU05-CA-02"
      nome.startsWith("intervalos de 15 e 30") -> "HU05-CA-03"
      nome.startsWith("emergencia libera 2 minutos") -> "HU05-CA-05"
      nome.startsWith("emergencia so e oferecida") -> "HU05-CA-04"
      nome.startsWith("sem blocosDiarios") -> "CA-05"
      nome.startsWith("com blocosDiarios") -> "CA-06"
      nome.startsWith("tarefa extra concluida em SALDO_ZERADO") -> "CA-07"
      nome.contains("cooldown") || nome.contains("virada do dia") || nome.startsWith("liberar fora") -> "CA-03"
      else -> "CA-02"
    }

  private val minuto = 60_000.0

  private fun carregarFixtures(): JSONObject {
    // Gradle roda os testes com working dir = android/app.
    val arquivo = File("../../src/domain/__fixtures__/saldoBloqueio.json")
    assertTrue("fixtures não encontradas em ${arquivo.absolutePath}", arquivo.exists())
    return JSONObject(arquivo.readText())
  }

  private fun configDoCaso(caso: JSONObject): ConfigBloco {
    val c = caso.optJSONObject("config") ?: return ConfigBloco()
    val p = ConfigBloco()
    return ConfigBloco(
      duracaoBlocoMin = c.optInt("duracaoBlocoMin", p.duracaoBlocoMin),
      cooldownMin = c.optInt("cooldownMin", p.cooldownMin),
      blocosDiarios = if (c.has("blocosDiarios") && !c.isNull("blocosDiarios")) c.getInt("blocosDiarios") else null,
      blocoPorTarefaExtra = c.optInt("blocoPorTarefaExtra", p.blocoPorTarefaExtra),
    )
  }

  private fun lista(arr: JSONArray?): List<String> =
    if (arr == null) emptyList() else (0 until arr.length()).map { arr.getString(it) }

  /** Roda os casos das fixtures do grupo; devolve quantos rodou. */
  private fun rodarGrupo(grupo: String): Int {
    val fixtures = carregarFixtures()
    val base = fixtures.getLong("base")
    val diaPadrao = fixtures.getString("dia")
    val casos = fixtures.getJSONArray("casos")
    var rodados = 0

    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val nome = caso.getString("nome")
      if (grupoDoCaso(nome) != grupo) continue
      rodados++
      val cfg = configDoCaso(caso)
      var estado = EstadoSaldo(dia = diaPadrao)
      val passos = caso.getJSONArray("passos")

      for (j in 0 until passos.length()) {
        val passo = passos.getJSONObject(j)
        val agora = base + Math.round(passo.getDouble("agoraMin") * minuto)
        val dia = passo.optString("dia", diaPadrao)
        val args = passo.optJSONObject("args")

        val resultado =
          when (val evento = passo.getString("evento")) {
            "aplicarSnapshot" ->
              SaldoBloqueioMaquina.aplicarSnapshot(
                estado,
                lista(args!!.optJSONArray("extrasConcluidas")),
                cfg,
                agora,
                dia,
              )
            "liberarBloco" -> SaldoBloqueioMaquina.liberarBloco(estado, cfg, agora, dia)
            "entrouEmPrimeiroPlano" -> SaldoBloqueioMaquina.entrouEmPrimeiroPlano(estado, cfg, agora, dia)
            "saiuDePrimeiroPlano" -> SaldoBloqueioMaquina.saiuDePrimeiroPlano(estado, cfg, agora, dia)
            "liberarAcessoRapido" -> SaldoBloqueioMaquina.liberarAcessoRapido(estado, cfg, agora, dia)
            "concluirEmergencia" -> SaldoBloqueioMaquina.concluirEmergencia(estado, cfg, agora, dia)
            "reconciliar" -> ResultadoTransicao(SaldoBloqueioMaquina.reconciliar(estado, cfg, agora, dia), true)
            else -> throw IllegalStateException("evento desconhecido: $evento")
          }
        estado = resultado.estado

        val esperado = passo.getJSONObject("esperado")
        for (chave in esperado.keys()) {
          val contexto = "caso \"$nome\" passo $j campo $chave"
          when (chave) {
            "ok" -> assertEquals(contexto, esperado.getBoolean(chave), resultado.ok)
            "fase" -> assertEquals(contexto, esperado.getString(chave), estado.fase.name)
            "saldo" -> assertEquals(contexto, esperado.getInt(chave), estado.saldo)
            "blocosUsados" -> assertEquals(contexto, esperado.getInt(chave), estado.blocosUsados)
            "permiteUso" -> assertEquals(contexto, esperado.getBoolean(chave), SaldoBloqueioMaquina.permiteUso(estado))
            "saldoDisponivel" ->
              assertEquals(
                contexto,
                if (esperado.isNull(chave)) null else esperado.getInt(chave),
                SaldoBloqueioMaquina.saldoDisponivel(estado, cfg),
              )
            "consumidoSeg" -> assertEquals(contexto, esperado.getDouble(chave), estado.consumidoMs / 1000.0, 1e-6)
            "restanteSeg" ->
              assertEquals(contexto, esperado.getDouble(chave), SaldoBloqueioMaquina.msRestantes(estado, cfg, agora) / 1000.0, 1e-6)
            "avisoUmMinuto" ->
              assertEquals(contexto, esperado.getBoolean(chave), SaldoBloqueioMaquina.avisoUmMinutoAtivo(estado, cfg, agora))
            "msAteAvisoSeg" -> {
              val obtido = SaldoBloqueioMaquina.msAteAviso(estado, cfg, agora)
              if (esperado.isNull(chave)) {
                assertEquals(contexto, null, obtido)
              } else {
                assertEquals(contexto, esperado.getDouble(chave), obtido!! / 1000.0, 1e-6)
              }
            }
            "fimCooldownEmMin" ->
              assertEquals(contexto, esperado.getDouble(chave), (estado.fimCooldownEm - base) / minuto, 1e-6)
            "liberacaoRapida" -> assertEquals(contexto, esperado.getString(chave), estado.liberacaoRapida.name)
            "acessoRapidoUsos" -> assertEquals(contexto, esperado.getInt(chave), estado.acessoRapidoUsos)
            "acessoRapidoFimUltimoEmMin" ->
              assertEquals(
                contexto,
                esperado.getDouble(chave),
                if (estado.acessoRapidoFimUltimoEm == 0L) 0.0 else (estado.acessoRapidoFimUltimoEm - base) / minuto,
                1e-6,
              )
            "liberacaoRestanteSeg" ->
              assertEquals(contexto, esperado.getDouble(chave), SaldoBloqueioMaquina.msRestantesLiberacaoRapida(estado, agora) / 1000.0, 1e-6)
            "emergenciaOferecida" ->
              assertEquals(contexto, esperado.getBoolean(chave), SaldoBloqueioMaquina.emergenciaOferecidaNoEstado(estado, cfg, agora, dia))
            else -> throw IllegalStateException("campo esperado desconhecido: $chave")
          }
        }
      }
    }
    return rodados
  }

  private fun exigir(grupo: String) {
    assertTrue("nenhum caso das fixtures para $grupo", rodarGrupo(grupo) > 0)
  }

  @Test
  fun `CA-02 fixtures compartilhadas - sessão só conta em primeiro plano`() = exigir("CA-02")

  @Test
  fun `CA-03 fixtures compartilhadas - fim da sessão abre cooldown de 45 minutos`() = exigir("CA-03")

  @Test
  fun `CA-05 fixtures compartilhadas - sem limite diário a 6ª sessão é oferecida`() = exigir("CA-05")

  @Test
  fun `CA-06 fixtures compartilhadas - saldo zerado só com blocosDiarios configurado`() = exigir("CA-06")

  @Test
  fun `CA-07 fixtures compartilhadas - extra concluída sai de SALDO_ZERADO`() = exigir("CA-07")

  @Test
  fun `CA-01 fixtures compartilhadas - acesso rápido conta 2 minutos só em primeiro plano`() = exigir("HU05-CA-01")

  @Test
  fun `CA-02 fixtures compartilhadas - acesso rápido no cooldown não mexe no cooldown`() = exigir("HU05-CA-02")

  @Test
  fun `CA-03 fixtures compartilhadas - intervalos de 15, 30 e 60 minutos e cota de 3`() = exigir("HU05-CA-03")

  @Test
  fun `CA-04 fixtures compartilhadas - emergência só é oferecida sem acesso rápido possível`() = exigir("HU05-CA-04")

  @Test
  fun `CA-05 fixtures compartilhadas - emergência libera 2 minutos`() = exigir("HU05-CA-05")

  @Test
  fun `CA-07 fixtures compartilhadas - emergência não consome a cota do acesso rápido`() = exigir("HU05-CA-05")

  @Test
  fun `defaults da máquina são 15 minutos, cooldown 45 e sem limite`() {
    val c = ConfigBloco()
    assertEquals(15, c.duracaoBlocoMin)
    assertEquals(45, c.cooldownMin)
    assertEquals(null, c.blocosDiarios)
    assertEquals(listOf(10, 20, 30, 40, 50, 60), SaldoBloqueioMaquina.SEQUENCIA_PAUSA_INTENCAO_SEG_V2)
    assertEquals(10, SaldoBloqueioMaquina.duracaoPausaIntencaoSeg(0))
    assertEquals(60, SaldoBloqueioMaquina.duracaoPausaIntencaoSeg(9))
  }
}
