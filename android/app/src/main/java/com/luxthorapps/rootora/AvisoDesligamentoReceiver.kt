package com.luxthorapps.rootora

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings

/** Fires when a scheduled reminder is due: applies RN-03 and shows the notification (RN-04). */
class AvisoDesligamentoReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val ordem = intent?.getIntExtra(AvisoDesligamentoAgendador.EXTRA_ORDEM, 0) ?: 0
    if (ordem == 0) return
    try {
      val condicoes =
        CondicoesExibicao(
          servicoDesligado = !servicoAcessibilidadeHabilitado(context),
          temRegrasBloqueio = BloqueioPrefs.lerRegrasBloqueio(context) != null,
          jaAtivadoAlgumaVez = AvisoDesligamentoPrefs.jaAtivadoAlgumaVez(context),
          notificacoesAtivas = AvisoDesligamentoPrefs.notificacoesAtivas(context),
        )
      // RN-03: any failed condition drops the reminder silently.
      if (!AvisoDesligamentoMaquina.deveExibirLembrete(condicoes)) return
      exibir(context, ordem)
    } catch (erro: Exception) {
      // Includes SecurityException without POST_NOTIFICATIONS: nothing shown, nothing breaks.
    }
  }

  private fun exibir(context: Context, ordem: Int) {
    val gerenciador = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!gerenciador.areNotificationsEnabled()) return
    criarCanal(gerenciador)

    val texto = AvisoDesligamentoMaquina.textoLembrete(ordem)
    val abrir =
      Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        putExtra(AvisoDesligamentoPrefs.EXTRA_DESTINO, AvisoDesligamentoPrefs.DESTINO_BLOQUEIO_APPS)
      }
    val contentIntent =
      PendingIntent.getActivity(context, ordem, abrir, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CANAL_ID)
      } else {
        @Suppress("DEPRECATION") Notification.Builder(context)
      }
    val notificacao =
      builder
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(texto.titulo)
        .setContentText(texto.corpo)
        .setContentIntent(contentIntent)
        .setAutoCancel(true)
        .build()
    gerenciador.notify(ID_NOTIFICACAO_BASE + ordem, notificacao)
  }

  /** Same channel id as src/services/notifications.ts (notifee); creating it again is a no-op. */
  private fun criarCanal(gerenciador: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    gerenciador.createNotificationChannel(
      NotificationChannel(CANAL_ID, "Lembretes", NotificationManager.IMPORTANCE_DEFAULT),
    )
  }

  /** Same check as RootoraAccessibilityModule.servicoAcessibilidadeHabilitado (minimal, deliberate duplication: no ReactContext here). */
  private fun servicoAcessibilidadeHabilitado(context: Context): Boolean {
    val resolver = context.contentResolver
    if (Settings.Secure.getInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0) != 1) return false
    val habilitados = Settings.Secure.getString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
    val nosso = ComponentName(context, RootoraAccessibilityService::class.java)
    return habilitados.split(':').any {
      it.equals(nosso.flattenToString(), ignoreCase = true) ||
        it.equals(nosso.flattenToShortString(), ignoreCase = true)
    }
  }

  companion object {
    private const val CANAL_ID = "lembretes-rootora"
    private const val ID_NOTIFICACAO_BASE = 7300
  }
}
