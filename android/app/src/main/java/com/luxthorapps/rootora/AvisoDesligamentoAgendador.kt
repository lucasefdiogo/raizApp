package com.luxthorapps.rootora

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Schedules the "blocking is off" reminders (RN-01, RN-02) with AlarmManager.
 * Alarms are INEXACT on purpose (setAndAllowWhileIdle): a 09:00 reminder does
 * not need to-the-second precision, and exact alarms would require the
 * SCHEDULE_EXACT_ALARM permission. Alarms do not survive a reboot; the
 * BootReceiver calls `reagendar`.
 */
object AvisoDesligamentoAgendador {
  const val EXTRA_ORDEM = "ordem_lembrete"
  private val ORDENS = listOf(1, 2)

  private fun pendingIntent(context: Context, ordem: Int, flags: Int): PendingIntent? {
    val intent = Intent(context, AvisoDesligamentoReceiver::class.java).putExtra(EXTRA_ORDEM, ordem)
    return PendingIntent.getBroadcast(context, ordem, intent, flags or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  /** Schedules the reminders still in the future for a shutdown at `desligadoEmMs`. */
  fun agendar(context: Context, desligadoEmMs: Long, agora: Long = System.currentTimeMillis()) {
    cancelar(context)
    val alarmes = alarmManager(context)
    for (lembrete in AvisoDesligamentoMaquina.lembretesAgendaveis(desligadoEmMs, null, agora)) {
      val pi = pendingIntent(context, lembrete.ordem, PendingIntent.FLAG_UPDATE_CURRENT) ?: continue
      alarmes.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, lembrete.em, pi)
    }
  }

  /** Cancels both pending reminders (re-enable, RN-01). Safe when none exist. */
  fun cancelar(context: Context) {
    val alarmes = alarmManager(context)
    for (ordem in ORDENS) {
      val pi = pendingIntent(context, ordem, PendingIntent.FLAG_UPDATE_CURRENT) ?: continue
      alarmes.cancel(pi)
      pi.cancel()
    }
  }

  /** Boot: reschedules only if the last recorded event is a shutdown; otherwise nothing is pending. */
  fun reagendar(context: Context, agora: Long = System.currentTimeMillis()) {
    val desligadoEm = AvisoDesligamentoPrefs.ultimoDesligamentoEmMs(context)
    if (desligadoEm == null) cancelar(context) else agendar(context, desligadoEm, agora)
  }

  /** Parses the ISO 8601 (with offset) timestamps written by AvisoDesligamentoPrefs. */
  fun parseIso(iso: String): Long? =
    try {
      SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).parse(iso)?.time
    } catch (erro: java.text.ParseException) {
      null
    }
}
