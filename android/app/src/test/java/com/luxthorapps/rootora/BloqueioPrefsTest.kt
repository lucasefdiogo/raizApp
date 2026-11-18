package com.luxthorapps.rootora

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** mesclarRegraVigente — parte pura de promoverPendentesSeVencidas, sem Context. */
class BloqueioPrefsTest {
  @Test
  fun `foco temporario nao consome saldo de blocos do app selecionado`() {
    assertFalse(BloqueioPrefs.deveContarSaldoDuranteFoco(true, true))
    assertTrue(BloqueioPrefs.deveContarSaldoDuranteFoco(true, false))
    assertFalse(BloqueioPrefs.deveContarSaldoDuranteFoco(false, false))
  }

  @Test
  fun `foco temporario intercepta somente app selecionado antes do prazo`() {
    assertTrue(BloqueioPrefs.interceptarDuranteFoco(true, 2000L, 1000L))
    assertFalse(BloqueioPrefs.interceptarDuranteFoco(false, 2000L, 1000L))
    assertFalse(BloqueioPrefs.interceptarDuranteFoco(true, 2000L, 2000L))
    assertFalse(BloqueioPrefs.interceptarDuranteFoco(true, 0L, 1000L))
  }

  @Test
  fun `foco intercepta fora da janela sem consultar o saldo`() {
    var saldoConsultado = false
    val intercepta = BloqueioPrefs.decidirInterceptacao(
      appSelecionado = true,
      focoTemporarioAtivo = true,
      dentroDaJanela = { false },
      appPodeAbrirPeloSaldo = {
        saldoConsultado = true
        true
      },
    )
    assertTrue(intercepta)
    assertFalse(saldoConsultado)
  }

  @Test
  fun `mescla a pendencia descartando efetivaEm`() {
    val pendente = JSONObject(
      """{"apps":["com.instagram.android"],"janelas":[],"efetivaEm":"2026-10-11"}""",
    )

    val vigente = BloqueioPrefs.mesclarRegraVigente(pendente)

    assertFalse(vigente.has("efetivaEm"))
    assertEquals("com.instagram.android", vigente.getJSONArray("apps").getString(0))
  }

  @Test
  fun `sem apps ou janelas na pendencia, supre com array vazio`() {
    val pendente = JSONObject("""{"efetivaEm":"2026-10-11"}""")

    val vigente = BloqueioPrefs.mesclarRegraVigente(pendente)

    assertTrue(vigente.has("apps"))
    assertEquals(0, vigente.getJSONArray("apps").length())
    assertTrue(vigente.has("janelas"))
    assertEquals(0, vigente.getJSONArray("janelas").length())
  }
}
