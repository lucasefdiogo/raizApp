package com.luxthorapps.rootora

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

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
   * Ignora o `savedInstanceState` de propósito — fix oficial do
   * react-native-screens (github.com/software-mansion/react-native-screens/
   * issues/17#issuecomment-424704067) pro crash fatal "Screen fragments
   * should never be restored". Sem isso, quando o Android mata o processo
   * em background (comum em fabricantes com gerenciamento agressivo de
   * memória, ex: ColorOS) e o usuário volta pela tela de Recentes, o
   * FragmentManager tenta reconstruir o ScreenStackFragment a partir do
   * Bundle salvo — algo que react-native-screens não suporta, já que quem
   * deve reconstruir a árvore de navegação é o React Navigation a partir
   * do estado JS, não o Android a partir de Fragments nativos serializados.
   * Passar `null` força a Activity a sempre recriar do zero nesse cenário.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    guardarDestinoPendente(intent)
  }

  /** singleTask: a reminder tap on a live instance arrives here instead of onCreate. */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    guardarDestinoPendente(intent)
    avisarJS(intent)
  }

  /**
   * App already in the foreground: AppState does not change, so tell JS to consume the pending
   * destination now. Without an active React context nothing is emitted; the stored destination
   * still applies on the next activation.
   */
  private fun avisarJS(intent: Intent?) {
    if (intent?.getStringExtra(AvisoDesligamentoPrefs.EXTRA_DESTINO) == null) return
    val app = application as? MainApplication ?: return
    val reactContext = app.reactHost.currentReactContext ?: return
    if (!reactContext.hasActiveReactInstance()) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENTO_DESTINO_NOTIFICACAO, null)
  }

  /** Stores the reminder destination (HU-03, RN-05); JS consumes it once via RootoraAccessibility. */
  private fun guardarDestinoPendente(intent: Intent?) {
    val destino = intent?.getStringExtra(AvisoDesligamentoPrefs.EXTRA_DESTINO) ?: return
    AvisoDesligamentoPrefs.salvarDestinoPendente(this, destino)
  }

  companion object {
    const val EVENTO_DESTINO_NOTIFICACAO = "destino-notificacao"
  }
}
