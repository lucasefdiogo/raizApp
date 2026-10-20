package com.luxthorapps.rootora

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Ponte nativa <-> JS pra medir o tempo de uso das redes sociais (HU-02).
 * Só lê eventos do UsageStatsManager; a agregação em segundos/aberturas
 * vive em domain/usoApps.ts. Mesmo estilo legado do
 * RootoraAccessibilityModule.
 */
class RootoraUsoAppsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NOME

  @ReactMethod
  fun temAcessoUso(promise: Promise) {
    try {
      val appOps =
        reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val modo =
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactApplicationContext.packageName,
        )
      promise.resolve(modo == AppOpsManager.MODE_ALLOWED)
    } catch (erro: Exception) {
      promise.reject("USAGE_ACCESS_CHECK_FAILED", erro)
    }
  }

  @ReactMethod
  fun abrirConfiguracoesAcessoUso() {
    val intent =
      Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    reactApplicationContext.startActivity(intent)
  }

  /**
   * Eventos ACTIVITY_RESUMED/PAUSED entre inicioMs e fimMs, só dos pacotes
   * da lista curada (RN-01). Formato igual a EventoUso em domain/usoApps.ts.
   */
  @ReactMethod
  fun lerEventosUso(inicioMs: Double, fimMs: Double, promise: Promise) {
    try {
      val manager =
        reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE)
          as UsageStatsManager
      val eventos = manager.queryEvents(inicioMs.toLong(), fimMs.toLong())
      val resultado = Arguments.createArray()
      val evento = UsageEvents.Event()
      while (eventos.hasNextEvent()) {
        eventos.getNextEvent(evento)
        if (evento.packageName !in PACOTES_REDES_SOCIAIS) continue
        val tipo =
          when (evento.eventType) {
            UsageEvents.Event.ACTIVITY_RESUMED -> "primeiro_plano"
            UsageEvents.Event.ACTIVITY_PAUSED -> "segundo_plano"
            else -> continue
          }
        val item = Arguments.createMap()
        item.putString("pacote", evento.packageName)
        item.putString("classe", evento.className ?: "")
        item.putString("tipo", tipo)
        item.putDouble("ts", evento.timeStamp.toDouble())
        resultado.pushMap(item)
      }
      promise.resolve(resultado)
    } catch (erro: Exception) {
      promise.reject("USAGE_EVENTS_FAILED", erro)
    }
  }

  companion object {
    const val NOME = "RootoraUsoApps"

    // Espelho de domain/redesSociais.ts e do <queries> do manifesto.
    private val PACOTES_REDES_SOCIAIS =
      setOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically",
        "com.ss.android.ugc.trill",
        "com.kwai.video",
        "com.facebook.katana",
        "com.facebook.lite",
        "com.twitter.android",
        "com.instagram.barcelona",
        "com.reddit.frontpage",
        "com.pinterest",
        "com.snapchat.android",
        "com.google.android.youtube",
      )
  }
}
