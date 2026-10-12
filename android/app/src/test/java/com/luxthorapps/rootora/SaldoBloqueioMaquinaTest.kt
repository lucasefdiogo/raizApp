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
      toleranciaMin = c.optInt("toleranciaMin", p.toleranciaMin),
      cooldownMin = c.optInt("cooldownMin", p.cooldownMin),
      blocosDiarios = c.optInt("blocosDiarios", p.blocosDiarios),
      blocoPorTarefaExtra = c.optInt("blocoPorTarefaExtra", p.blocoPorTarefaExtra),
    )
  }

  private fun lista(arr: JSONArray?): List<String> =
    if (arr == null) emptyList() else (0 until arr.length()).map { arr.getString(it) }

  @Test
  fun fixturesCompartilhadasComOJest() {
    val fixtures = carregarFixtures()
    val base = fixtures.getLong("base")
    val diaPadrao = fixtures.getString("dia")
    val casos = fixtures.getJSONArray("casos")

    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val nome = caso.getString("nome")
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
                args!!.getBoolean("essencialCumprido"),
                lista(args.optJSONArray("extrasConcluidas")),
                cfg,
                agora,
                dia,
              )
            "liberarBloco" -> SaldoBloqueioMaquina.liberarBloco(estado, cfg, agora, dia)
            "entrouEmPrimeiroPlano" -> SaldoBloqueioMaquina.entrouEmPrimeiroPlano(estado, cfg, agora, dia)
            "saiuDePrimeiroPlano" -> SaldoBloqueioMaquina.saiuDePrimeiroPlano(estado, cfg, agora, dia)
            "usarTolerancia" -> SaldoBloqueioMaquina.usarTolerancia(estado, cfg, agora, dia)
            "recusarTolerancia" -> SaldoBloqueioMaquina.recusarTolerancia(estado, cfg, agora, dia)
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
            "toleranciasUsadas" -> assertEquals(contexto, esperado.getInt(chave), estado.toleranciasUsadas)
            "toleranciaUsada" -> assertEquals(contexto, esperado.getBoolean(chave), estado.toleranciaUsada)
            "toleranciaAtiva" -> assertEquals(contexto, esperado.getBoolean(chave), estado.toleranciaAtiva)
            "permiteUso" -> assertEquals(contexto, esperado.getBoolean(chave), SaldoBloqueioMaquina.permiteUso(estado))
            "consumidoSeg" -> assertEquals(contexto, esperado.getDouble(chave), estado.consumidoMs / 1000.0, 1e-6)
            "fimCooldownEmMin" ->
              assertEquals(contexto, esperado.getDouble(chave), (estado.fimCooldownEm - base) / minuto, 1e-6)
            else -> throw IllegalStateException("campo esperado desconhecido: $chave")
          }
        }
      }
    }
  }
}
