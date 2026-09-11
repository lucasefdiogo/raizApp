package com.lucas.rootora

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Primeiro incremento do bloqueio de apps (Fase 3): detecta qual app está em
 * primeiro plano via TYPE_WINDOW_STATE_CHANGED e repassa o nome do pacote pro
 * lado JS. Não lê conteúdo de tela (canRetrieveWindowContent="false" no
 * config) — só o nome do pacote.
 *
 * Sem overlay, sem regras de bloqueio, sem desbloqueio: isto é só a detecção
 * e a ponte, pra validar o pipeline antes de construir em cima.
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
