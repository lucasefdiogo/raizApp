package com.lucas.rootora

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Detecta qual app está em primeiro plano via TYPE_WINDOW_STATE_CHANGED.
 * Primeiro incremento (Fase 3, parte 1) só repassava isso pro lado JS pra
 * debug; terceiro incremento (parte 3) usa a mesma detecção pra avaliar o
 * bloqueio — ver avaliarBloqueio. Não lê conteúdo de tela
 * (canRetrieveWindowContent="false" no config) — só o nome do pacote.
 */
class RootoraAccessibilityService : AccessibilityService() {

  private var ultimoPacote: String? = null

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      return
    }

    val pacote = event.packageName?.toString()
    if (pacote.isNullOrEmpty() || pacote == ultimoPacote) {
      return
    }

    ultimoPacote = pacote
    emitirParaJS(pacote)
    avaliarBloqueio(pacote)
  }

  /**
   * Lê a config espelhada em SharedPreferences (não do Firestore — o
   * serviço roda fora do ciclo de vida do React, ver BloqueioPrefs) e, se
   * as 4 condições de bloqueio baterem, traz a MainActivity pra frente por
   * cima do app. CLEAR_TOP + launchMode="singleTask" (ver AndroidManifest)
   * fazem isso reaproveitar a Activity existente via onNewIntent em vez de
   * criar uma nova, se o Rootora já estiver de pé.
   */
  private fun avaliarBloqueio(pacote: String) {
    if (!BloqueioPrefs.deveBloquear(applicationContext, pacote)) {
      return
    }

    val intent =
      Intent(applicationContext, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        putExtra(MainActivity.EXTRA_BLOCKED_PACKAGE, pacote)
      }
    startActivity(intent)
  }

  override fun onInterrupt() {
    // Nada a fazer — não mantemos estado que precise ser interrompido.
  }

  private fun emitirParaJS(pacote: String) {
    val reactContext = reactContextAtivo() ?: return
    val payload = Arguments.createMap().apply { putString("packageName", pacote) }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENTO_APP_PRIMEIRO_PLANO, payload)
  }

  /**
   * O serviço roda fora do ciclo de vida do React. Só dá pra emitir evento se
   * houver um ReactContext vivo (app aberto). Sem isso, o evento é
   * descartado — aceitável pro escopo desta tarefa (tela de debug aberta).
   */
  private fun reactContextAtivo(): ReactContext? {
    val app = applicationContext as? MainApplication ?: return null
    val reactContext = app.reactHost.currentReactContext
    return if (reactContext != null && reactContext.hasActiveReactInstance()) {
      reactContext
    } else {
      null
    }
  }

  companion object {
    const val EVENTO_APP_PRIMEIRO_PLANO = "app-foreground-changed"
  }
}
