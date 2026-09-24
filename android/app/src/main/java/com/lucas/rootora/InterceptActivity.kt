package com.lucas.rootora

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Activity separada da MainActivity — monta só o root 'Intercept'
 * (AppRegistry.registerComponent em index.js), não RootNavigator/
 * MainTabNavigator inteiros. Iniciada pelo RootoraAccessibilityService
 * (ver avaliarIntercept) quando um pacote bate as condições de
 * `BloqueioPrefs.deveInterceptar` — meta de <300ms até aparecer, por isso
 * não reaproveita a Activity principal nem espera nenhum round-trip de
 * rede: os 3 extras do Intent já vêm prontos (packageName, appLabel,
 * snapshotJson, e opcionalmente sessaoAtivaJson) direto do SharedPreferences
 * que o JS mantém espelhado (ver BloqueioPrefs).
 *
 * Sempre uma instância nova por detecção (sem launchMode singleTask) — ver
 * InterceptRoot.tsx/useFocusSession pro porquê "reabrir com o timer em
 * andamento" não depende de reaproveitar Activity: a instância nova recebe
 * sessaoAtivaJson com o tempo restante já calculado.
 */
class InterceptActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Intercept"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
      override fun getLaunchOptions(): Bundle {
        val extras = intent?.extras
        return Bundle().apply {
          putString("packageName", extras?.getString(EXTRA_PACKAGE_NAME) ?: "")
          putString("appLabel", extras?.getString(EXTRA_APP_LABEL) ?: "")
          putString(
            "snapshotJson",
            extras?.getString(EXTRA_SNAPSHOT_JSON) ?: "{\"tarefas\":[]}",
          )
          val sessaoAtivaJson = extras?.getString(EXTRA_SESSAO_ATIVA_JSON)
          if (sessaoAtivaJson != null) {
            putString("sessaoAtivaJson", sessaoAtivaJson)
          }
        }
      }
    }

  companion object {
    const val EXTRA_PACKAGE_NAME = "packageName"
    const val EXTRA_APP_LABEL = "appLabel"
    const val EXTRA_SNAPSHOT_JSON = "snapshotJson"
    const val EXTRA_SESSAO_ATIVA_JSON = "sessaoAtivaJson"
  }
}
