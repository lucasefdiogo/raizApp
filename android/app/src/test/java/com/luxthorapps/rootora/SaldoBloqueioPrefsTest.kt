package com.luxthorapps.rootora

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Serialização/leitura do estado e da config (partes puras de SaldoBloqueioPrefs, sem Context). */
class SaldoBloqueioPrefsTest {
  private fun estadoSalvo(fase: String, extra: String = ""): String =
    """{"dia":"2026-10-11","fase":"$fase","saldo":2,"blocosUsados":3,"toleranciasUsadas":1,
       "essencialCreditado":true,"toleranciaUsada":true,"toleranciaAtiva":true,
       "consumidoMs":120000,"fimCooldownEm":5000,"fgDesde":0$extra}"""

  @Test
  fun `CA-03 estado salvo com fase antiga BLOCO_ATIVO ou TOLERANCIA é lido sem quebrar`() {
    val ativo = SaldoBloqueioPrefs.deJson(estadoSalvo("BLOCO_ATIVO"), "2099-01-01")
    assertEquals(FaseBloqueio.SESSAO_ATIVA, ativo.fase)
    assertEquals("2026-10-11", ativo.dia)
    assertEquals(3, ativo.blocosUsados)
    assertEquals(120_000L, ativo.consumidoMs)

    val tolerancia = SaldoBloqueioPrefs.deJson(estadoSalvo("TOLERANCIA"), "2099-01-01")
    assertEquals(FaseBloqueio.COOLDOWN, tolerancia.fase)
    assertEquals(5_000L, tolerancia.fimCooldownEm)

    val semEssencial = SaldoBloqueioPrefs.deJson(estadoSalvo("BLOQUEADO_SEM_ESSENCIAL"), "2099-01-01")
    assertEquals(FaseBloqueio.AGUARDANDO_LIBERACAO, semEssencial.fase)
    assertEquals(2, semEssencial.saldo)
  }

  @Test
  fun `CA-03 fase nova e fase desconhecida continuam lidas`() {
    assertEquals(FaseBloqueio.COOLDOWN, SaldoBloqueioPrefs.deJson(estadoSalvo("COOLDOWN"), "d").fase)
    assertEquals(FaseBloqueio.SALDO_ZERADO, SaldoBloqueioPrefs.deJson(estadoSalvo("SALDO_ZERADO"), "d").fase)
    assertEquals(FaseBloqueio.AGUARDANDO_LIBERACAO, SaldoBloqueioPrefs.deJson(estadoSalvo("FASE_QUE_NAO_EXISTE"), "d").fase)
    assertEquals(FaseBloqueio.AGUARDANDO_LIBERACAO, SaldoBloqueioPrefs.deJson("{nao e json", "2026-10-12").fase)
  }

  @Test
  fun `CA-03 estado gravado nao carrega campos de tolerancia`() {
    val json = SaldoBloqueioPrefs.paraJson(EstadoSaldo(dia = "2026-10-11", fase = FaseBloqueio.COOLDOWN))
    assertFalse(json.has("toleranciasUsadas"))
    assertFalse(json.has("toleranciaUsada"))
    assertFalse(json.has("toleranciaAtiva"))
    assertFalse(json.has("essencialCreditado"))
    assertEquals("COOLDOWN", json.getString("fase"))
  }

  @Test
  fun `CA-03 RN-10 sem regras salvas valem os padroes novos`() {
    val cfg = SaldoBloqueioPrefs.configDasRegras(null)
    assertEquals(15, cfg.duracaoBlocoMin)
    assertEquals(45, cfg.cooldownMin)
    assertNull(cfg.blocosDiarios)
  }

  @Test
  fun `CA-06 RN-10 regras com padrao antigo gravado passam ao padrao novo e escolhas do usuario ficam`() {
    val antigo = SaldoBloqueioPrefs.configDasRegras("""{"duracaoBlocoMin":15,"toleranciaMin":2,"cooldownMin":30,"blocosDiarios":4}""")
    assertEquals(45, antigo.cooldownMin)
    assertNull(antigo.blocosDiarios)

    val escolhido = SaldoBloqueioPrefs.configDasRegras("""{"duracaoBlocoMin":20,"cooldownMin":60,"blocosDiarios":3}""")
    assertEquals(20, escolhido.duracaoBlocoMin)
    assertEquals(60, escolhido.cooldownMin)
    assertEquals(3, escolhido.blocosDiarios)
  }

  @Test
  fun `CA-03 visao expoe tempo restante e aviso de 1 minuto sem campos de tolerancia`() {
    val cfg = ConfigBloco()
    val agora = 1_000_000L
    val sessao = EstadoSaldo(dia = "d", fase = FaseBloqueio.SESSAO_ATIVA, consumidoMs = 14 * 60_000L + 10_000L, fgDesde = agora)
    val v = JSONObject(SaldoBloqueioPrefs.visaoParaJson(sessao, cfg, agora))
    assertTrue(v.getBoolean("avisoUmMinutoAtivo"))
    assertEquals(50_000L, v.getLong("msRestantes"))
    assertEquals(0L, v.getLong("msAteAviso"))
    assertFalse(v.getJSONObject("config").has("toleranciaMin"))
    assertEquals(agora, v.getLong("agora"))

    val comTempo = EstadoSaldo(dia = "d", fase = FaseBloqueio.SESSAO_ATIVA, consumidoMs = 0L, fgDesde = agora)
    val v2 = JSONObject(SaldoBloqueioPrefs.visaoParaJson(comTempo, cfg, agora))
    assertFalse(v2.getBoolean("avisoUmMinutoAtivo"))
    assertEquals(15 * 60_000L, v2.getLong("msRestantes"))
    assertEquals(14 * 60_000L, v2.getLong("msAteAviso"))

    val parado = EstadoSaldo(dia = "d", fase = FaseBloqueio.SESSAO_ATIVA)
    assertFalse(JSONObject(SaldoBloqueioPrefs.visaoParaJson(parado, cfg, agora)).has("msAteAviso"))
  }
}
