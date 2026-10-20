package com.luxthorapps.rootora

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

/** One recorded accessibility service on/off event. `em` is ISO 8601 with the device local offset. */
data class EventoAcessibilidadeNativo(val id: String, val tipo: String, val em: String, val enviado: Boolean)

/**
 * Native log of accessibility service shutdown/re-enable events (HU-03).
 * The service and the app-open check run without a live JS runtime, so the
 * log lives in SharedPreferences; JS drains it through
 * RootoraAccessibilityModule. The JSON logic is in pure functions (no
 * Context) so it is unit-testable on the plain JVM; the Context part below is
 * a thin layer over them.
 */
object AvisoDesligamentoPrefs {
  const val TIPO_DESLIGAMENTO = "desligamento"
  const val TIPO_RELIGAMENTO = "religamento"

  private const val PREFS_NOME = "rootora_aviso_desligamento"
  private const val CHAVE_EVENTOS = "eventos"
  private const val CHAVE_JA_ATIVADO = "ja_ativado_alguma_vez"
  private const val CHAVE_NOTIFICACOES_ATIVAS = "notificacoes_ativas"

  // ---- Pure logic ----

  private fun formatarLocal(emMs: Long, zona: TimeZone): String {
    val formato = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
    formato.timeZone = zona
    return formato.format(Date(emMs))
  }

  private fun lerArray(listaJson: String?): JSONArray =
    if (listaJson.isNullOrEmpty()) JSONArray() else JSONArray(listaJson)

  /** Appends an event unless the last one already has the same type (no equal events in sequence). */
  fun registrarEvento(
    listaJson: String?,
    tipo: String,
    emMs: Long,
    idNovo: String,
    zona: TimeZone = TimeZone.getDefault(),
  ): String {
    val lista = lerArray(listaJson)
    if (ultimoEvento(listaJson) == tipo) return lista.toString()
    lista.put(
      JSONObject()
        .put("id", idNovo)
        .put("tipo", tipo)
        .put("em", formatarLocal(emMs, zona))
        .put("enviado", false),
    )
    return lista.toString()
  }

  /** Unsent events, oldest first (the log is append-only). */
  fun pendentes(listaJson: String?): List<EventoAcessibilidadeNativo> {
    val lista = lerArray(listaJson)
    return (0 until lista.length())
      .map { lista.getJSONObject(it) }
      .filter { !it.optBoolean("enviado", false) }
      .map { EventoAcessibilidadeNativo(it.getString("id"), it.getString("tipo"), it.getString("em"), false) }
  }

  /** Flags the given ids as sent; history is kept so `ultimoEvento` stays known. */
  fun marcarEnviados(listaJson: String?, ids: List<String>): String {
    val lista = lerArray(listaJson)
    for (i in 0 until lista.length()) {
      val evento = lista.getJSONObject(i)
      if (evento.getString("id") in ids) evento.put("enviado", true)
    }
    return lista.toString()
  }

  /** Type of the most recent event ("desligamento"/"religamento"), or null without events. */
  fun ultimoEvento(listaJson: String?): String? {
    val lista = lerArray(listaJson)
    if (lista.length() == 0) return null
    return lista.getJSONObject(lista.length() - 1).getString("tipo")
  }

  /** RN-06: records a shutdown on app open when the service is off and none is recorded since the last re-enable. */
  fun registrarDesligamentoNaAbertura(
    listaJson: String?,
    servicoDesligado: Boolean,
    emMs: Long,
    idNovo: String,
    zona: TimeZone = TimeZone.getDefault(),
  ): String =
    if (AvisoDesligamentoMaquina.deveRegistrarDesligamentoNaAbertura(servicoDesligado, ultimoEvento(listaJson))) {
      registrarEvento(listaJson, TIPO_DESLIGAMENTO, emMs, idNovo, zona)
    } else {
      lerArray(listaJson).toString()
    }

  /**
   * RN-01: a connection is a re-enable only when the last event is a
   * shutdown. The very first connection (initial activation) records
   * nothing: there was no shutdown to cancel.
   */
  fun registrarReligamento(
    listaJson: String?,
    emMs: Long,
    idNovo: String,
    zona: TimeZone = TimeZone.getDefault(),
  ): String =
    if (ultimoEvento(listaJson) == TIPO_DESLIGAMENTO) {
      registrarEvento(listaJson, TIPO_RELIGAMENTO, emMs, idNovo, zona)
    } else {
      lerArray(listaJson).toString()
    }

  // ---- Context layer (thin) ----

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)

  private fun lerEventos(context: Context): String? = prefs(context).getString(CHAVE_EVENTOS, null)

  private fun gravarEventos(context: Context, json: String) {
    prefs(context).edit().putString(CHAVE_EVENTOS, json).apply()
  }

  private fun novoId() = UUID.randomUUID().toString()

  // Read-modify-write is synchronized: the service thread and the RN bridge thread both write the log.
  @Synchronized
  fun registrarDesligamento(context: Context) {
    gravarEventos(context, registrarEvento(lerEventos(context), TIPO_DESLIGAMENTO, System.currentTimeMillis(), novoId()))
  }

  /** Called on every service connection: marks "already activated" and records a re-enable if due. */
  @Synchronized
  fun registrarConexaoDoServico(context: Context) {
    gravarEventos(context, registrarReligamento(lerEventos(context), System.currentTimeMillis(), novoId()))
    prefs(context).edit().putBoolean(CHAVE_JA_ATIVADO, true).apply()
  }

  @Synchronized
  fun registrarDesligamentoNaAbertura(context: Context, servicoDesligado: Boolean) {
    gravarEventos(
      context,
      registrarDesligamentoNaAbertura(lerEventos(context), servicoDesligado, System.currentTimeMillis(), novoId()),
    )
  }

  fun lerPendentes(context: Context): List<EventoAcessibilidadeNativo> = pendentes(lerEventos(context))

  @Synchronized
  fun marcarEnviados(context: Context, ids: List<String>) {
    gravarEventos(context, marcarEnviados(lerEventos(context), ids))
  }

  fun jaAtivadoAlgumaVez(context: Context): Boolean = prefs(context).getBoolean(CHAVE_JA_ATIVADO, false)

  fun salvarNotificacoesAtivas(context: Context, ativas: Boolean) {
    prefs(context).edit().putBoolean(CHAVE_NOTIFICACOES_ATIVAS, ativas).apply()
  }

  /** Mirror of the JS setting; defaults to true until JS mirrors it (opt-out setting). */
  fun notificacoesAtivas(context: Context): Boolean = prefs(context).getBoolean(CHAVE_NOTIFICACOES_ATIVAS, true)
}
