package com.luxthorapps.rootora

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Reschedules the pending reminders after a reboot (alarms are lost on reboot). */
class AvisoDesligamentoBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
    try {
      AvisoDesligamentoAgendador.reagendar(context)
    } catch (erro: Exception) {
      // Never crash the boot broadcast; the next app open re-checks (RN-06).
    }
  }
}
