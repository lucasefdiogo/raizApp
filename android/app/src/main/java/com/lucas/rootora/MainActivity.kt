package com.lucas.rootora

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "raizApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Cold start a partir do bloqueio (Rootora aberto pela 1ª vez já trazido
   * pelo RootoraAccessibilityService): o intent que criou a Activity já
   * carrega o extra, mas ainda não existe ReactContext pra emitir o evento
   * a tempo de algum listener JS captar — fica pendente até o JS consumir
   * via getInitialBlockedPackage().
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    processarIntentBloqueio(intent)
  }

  /**
   * launchMode="singleTask" + FLAG_ACTIVITY_CLEAR_TOP (ver
   * RootoraAccessibilityService.kt) faz isso disparar em vez de onCreate
   * quando o Rootora já está de pé — aqui o ReactContext já existe, então
   * emite o evento direto.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    processarIntentBloqueio(intent)
  }

  private fun processarIntentBloqueio(intent: Intent?) {
    val pacote = intent?.getStringExtra(EXTRA_BLOCKED_PACKAGE) ?: return
    intent.removeExtra(EXTRA_BLOCKED_PACKAGE)

    val reactContext = (application as? MainApplication)?.reactHost?.currentReactContext
    if (reactContext != null && reactContext.hasActiveReactInstance()) {
      val payload = Arguments.createMap().apply { putString("packageName", pacote) }
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENTO_APP_BLOQUEADO, payload)
    } else {
      pacoteBloqueadoPendente = pacote
    }
  }

  companion object {
    const val EXTRA_BLOCKED_PACKAGE = "blockedPackage"
    const val EVENTO_APP_BLOQUEADO = "blocked-app-detected"

    @Volatile
    private var pacoteBloqueadoPendente: String? = null

    /** Consumida uma única vez — ver RootoraAccessibilityModule.getInitialBlockedPackage. */
    fun consumirPacoteBloqueadoPendente(): String? {
      val valor = pacoteBloqueadoPendente
      pacoteBloqueadoPendente = null
      return valor
    }
  }
}
