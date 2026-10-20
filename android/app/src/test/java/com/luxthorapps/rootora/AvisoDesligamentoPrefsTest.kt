package com.luxthorapps.rootora

import java.time.OffsetDateTime
import java.util.TimeZone
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Pure JSON logic behind the accessibility on/off event log (no Context needed). */
class AvisoDesligamentoPrefsTest {
  private val zona = TimeZone.getTimeZone("GMT-03:00")

  private fun ms(iso: String) = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

  private val t1 = ms("2026-10-19T22:00:00.000-03:00")
  private val t2 = ms("2026-10-20T08:30:00.000-03:00")
  private val t3 = ms("2026-10-21T09:15:00.000-03:00")

  @Test
  fun `CA-05 registers an event with id, local ISO time with offset and not sent`() {
    val json = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)

    val arr = JSONArray(json)
    assertEquals(1, arr.length())
    assertEquals("e1", arr.getJSONObject(0).getString("id"))
    assertEquals("desligamento", arr.getJSONObject(0).getString("tipo"))
    assertEquals("2026-10-19T22:00:00.000-03:00", arr.getJSONObject(0).getString("em"))
    assertEquals(false, arr.getJSONObject(0).getBoolean("enviado"))
  }

  @Test
  fun `CA-05 pendentes returns only unsent events oldest first and marcarEnviados removes them`() {
    var json = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)
    json = AvisoDesligamentoPrefs.registrarEvento(json, "religamento", t2, "e2", zona)
    json = AvisoDesligamentoPrefs.registrarEvento(json, "desligamento", t3, "e3", zona)

    assertEquals(listOf("e1", "e2", "e3"), AvisoDesligamentoPrefs.pendentes(json).map { it.id })

    val depois = AvisoDesligamentoPrefs.marcarEnviados(json, listOf("e1", "e2"))
    assertEquals(listOf("e3"), AvisoDesligamentoPrefs.pendentes(depois).map { it.id })
    // Marking as sent does not erase history: the last event is still known.
    assertEquals("desligamento", AvisoDesligamentoPrefs.ultimoEvento(depois))
    assertEquals(
      "2026-10-19T22:00:00.000-03:00",
      AvisoDesligamentoPrefs.pendentes(json).first().em,
    )
  }

  @Test
  fun `CA-05 ultimoEvento is null without events and the last type otherwise`() {
    assertNull(AvisoDesligamentoPrefs.ultimoEvento(null))
    assertNull(AvisoDesligamentoPrefs.ultimoEvento("[]"))
    val json = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)
    assertEquals("desligamento", AvisoDesligamentoPrefs.ultimoEvento(json))
  }

  @Test
  fun `CA-07 does not register two equal events in sequence`() {
    var json = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)
    json = AvisoDesligamentoPrefs.registrarEvento(json, "desligamento", t2, "e2", zona)

    assertEquals(listOf("e1"), AvisoDesligamentoPrefs.pendentes(json).map { it.id })
  }

  @Test
  fun `CA-07 registrar desligamento na abertura registers when service is off and last event is not a shutdown`() {
    val vazio = AvisoDesligamentoPrefs.registrarDesligamentoNaAbertura(null, true, t1, "e1", zona)
    assertEquals("desligamento", AvisoDesligamentoPrefs.ultimoEvento(vazio))

    var json = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)
    json = AvisoDesligamentoPrefs.registrarEvento(json, "religamento", t2, "e2", zona)
    val depois = AvisoDesligamentoPrefs.registrarDesligamentoNaAbertura(json, true, t3, "e3", zona)
    assertEquals(listOf("e1", "e2", "e3"), AvisoDesligamentoPrefs.pendentes(depois).map { it.id })
  }

  @Test
  fun `CA-07 registrar desligamento na abertura does not duplicate a shutdown already recorded`() {
    val json = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)

    val depois = AvisoDesligamentoPrefs.registrarDesligamentoNaAbertura(json, true, t3, "e3", zona)

    assertEquals(json, depois)
  }

  @Test
  fun `CA-07 registrar desligamento na abertura does nothing while the service is on`() {
    val json = AvisoDesligamentoPrefs.registrarEvento(null, "religamento", t1, "e1", zona)

    assertEquals(json, AvisoDesligamentoPrefs.registrarDesligamentoNaAbertura(json, false, t3, "e3", zona))
    assertEquals("[]", AvisoDesligamentoPrefs.registrarDesligamentoNaAbertura(null, false, t3, "e3", zona))
  }

  @Test
  fun `RN-01 registers a re-enable only after a recorded shutdown`() {
    // First ever connection (no shutdown before) is the initial activation, not a re-enable.
    assertEquals("[]", AvisoDesligamentoPrefs.registrarReligamento(null, t1, "e1", zona))

    val desligado = AvisoDesligamentoPrefs.registrarEvento(null, "desligamento", t1, "e1", zona)
    val religado = AvisoDesligamentoPrefs.registrarReligamento(desligado, t2, "e2", zona)
    assertEquals("religamento", AvisoDesligamentoPrefs.ultimoEvento(religado))
    assertEquals(religado, AvisoDesligamentoPrefs.registrarReligamento(religado, t3, "e3", zona))
  }
}
