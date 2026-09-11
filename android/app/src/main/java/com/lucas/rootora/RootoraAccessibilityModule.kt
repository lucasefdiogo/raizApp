package com.lucas.rootora

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Ponte nativa <-> JS pra parte de acessibilidade. Módulo no estilo legado
 * (ReactContextBaseJavaModule) — funciona sob a New Architecture pela camada
 * de interop do RN 0.87, sem codegen.
 *
 * Só duas coisas: dizer se o Accessibility Service está habilitado e abrir a
 * tela do sistema pra habilitar. A emissão de eventos de troca de app vem do
 * RootoraAccessibilityService, via RCTDeviceEventEmitter.
 */
class RootoraAccessibilityModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NOME

  @ReactMethod
  fun isAccessibilityServiceEnabled(promise: Promise) {
    try {
      val resolver = reactApplicationContext.contentResolver

      val habilitadoGlobal =
        Settings.Secure.getInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1
      if (!habilitadoGlobal) {
        promise.resolve(false)
        return
      }

      val servicosHabilitados =
        Settings.Secure.getString(
          resolver,
          Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: ""

      val nosso = ComponentName(
        reactApplicationContext,
        RootoraAccessibilityService::class.java,
      )
      val ativo =
        servicosHabilitados.split(':').any { entrada ->
          entrada.equals(nosso.flattenToString(), ignoreCase = true) ||
            entrada.equals(nosso.flattenToShortString(), ignoreCase = true)
        }

      promise.resolve(ativo)
    } catch (erro: Exception) {
      promise.reject("ACCESSIBILITY_CHECK_FAILED", erro)
    }
  }

  @ReactMethod
  fun openAccessibilitySettings() {
    val intent =
      Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    reactApplicationContext.startActivity(intent)
  }

  companion object {
    const val NOME = "RootoraAccessibility"
  }
}
