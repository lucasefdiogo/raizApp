package com.luxthorapps.rootora

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** mesclarRegraVigente — parte pura de promoverPendentesSeVencidas, sem Context. */
class BloqueioPrefsTest {
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
