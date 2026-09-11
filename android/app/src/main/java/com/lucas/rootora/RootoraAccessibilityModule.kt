package com.lucas.rootora

import android.content.ComponentName
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import org.json.JSONArray
import org.json.JSONObject

/**
 * Ponte nativa <-> JS pra parte de acessibilidade e bloqueio de apps. Módulo
 * no estilo legado (ReactContextBaseJavaModule) — funciona sob a New
 * Architecture pela camada de interop do RN 0.87, sem codegen. Mantido num
 * módulo só (em vez de separar "detecção" de "listagem de apps"): as duas
 * partes são pequenas e cabem numa única ponte sem ficar confuso — separar
 * só valeria a pena se cada lado crescesse bastante.
 *
 * getInstalledApps + isAccessibilityServiceEnabled/openAccessibilitySettings
 * (mais a emissão de eventos de troca de app, via RootoraAccessibilityService).
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

  /**
   * Lista os apps que o usuário instalou (exclui apps de sistema e o
   * próprio Rootora — não faz sentido "bloquear" nenhum dos dois). Roda numa
   * thread separada porque converter cada ícone em PNG/base64 pode ser lento
   * com muitos apps instalados — não pode travar a UI thread.
   */
  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    Thread {
      try {
        val pm = reactApplicationContext.packageManager
        val meuPacote = reactApplicationContext.packageName
        val instalados = pm.getInstalledApplications(PackageManager.GET_META_DATA)

        val resultado = Arguments.createArray()
        for (appInfo in instalados) {
          val ehSistema = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
          if (ehSistema || appInfo.packageName == meuPacote) {
            continue
          }

          val mapa = Arguments.createMap()
          mapa.putString("packageName", appInfo.packageName)
          mapa.putString("nome", pm.getApplicationLabel(appInfo).toString())

          val iconeBase64 =
            try {
              iconeParaBase64(pm.getApplicationIcon(appInfo))
            } catch (erroIcone: Exception) {
              null
            }
          if (iconeBase64 != null) {
            mapa.putString("icone", iconeBase64)
          } else {
            mapa.putNull("icone")
          }

          resultado.pushMap(mapa)
        }

        promise.resolve(resultado)
      } catch (erro: Exception) {
        promise.reject("GET_INSTALLED_APPS_FAILED", erro)
      }
    }.start()
  }

  /**
   * Espelha a config de bloqueio em SharedPreferences (BloqueioPrefs) —
   * é o que o RootoraAccessibilityService lê a cada troca de app, fora do
   * ciclo de vida do React. Falha silenciosa: um JSON malformado não deve
   * derrubar o app, e a config sincroniza de novo na próxima escrita ou no
   * próximo boot (useAppBlockConfig chama isso nos dois casos).
   */
  @ReactMethod
  fun syncBloqueioConfig(configJson: String) {
    try {
      val json = JSONObject(configJson)
      val ativo = json.optBoolean("ativo", false)

      val appsArray = json.optJSONArray("appsSelecionados") ?: JSONArray()
      val apps = (0 until appsArray.length()).map { appsArray.getString(it) }

      val horarioInicio =
        if (json.isNull("horarioInicio")) null else json.getString("horarioInicio")
      val horarioFim =
        if (json.isNull("horarioFim")) null else json.getString("horarioFim")

      BloqueioPrefs.salvarConfig(reactApplicationContext, ativo, apps, horarioInicio, horarioFim)
    } catch (erro: Exception) {
      // Não crítico — ver comentário da função.
    }
  }

  /**
   * Libera packageName do bloqueio por `minutos` a partir de agora. O
   * bridge legado converte number do JS pra Double aqui — arredonda pra
   * minutos inteiros antes de gravar.
   */
  @ReactMethod
  fun registrarDesbloqueioTemporario(packageName: String, minutos: Double) {
    BloqueioPrefs.registrarDesbloqueioTemporario(
      reactApplicationContext,
      packageName,
      minutos.toInt(),
    )
  }

  /**
   * Consome o packageName bloqueado pendente de um cold start (ver
   * MainActivity.onCreate) — null quando o Rootora foi aberto normalmente.
   */
  @ReactMethod
  fun getInitialBlockedPackage(promise: Promise) {
    promise.resolve(MainActivity.consumirPacoteBloqueadoPendente())
  }

  /**
   * Reduz pra um tamanho pequeno antes de codificar — é só pra uma linha de
   * lista, ícone em resolução cheia (xxxhdpi) deixaria o payload e a
   * codificação bem mais lentos sem ganho visual nenhum.
   */
  private fun iconeParaBase64(drawable: Drawable): String {
    val bitmap = drawableParaBitmap(drawable)
    val bitmapReduzido =
      Bitmap.createScaledBitmap(bitmap, TAMANHO_ICONE_PX, TAMANHO_ICONE_PX, true)
    val saida = ByteArrayOutputStream()
    bitmapReduzido.compress(Bitmap.CompressFormat.PNG, 100, saida)
    return Base64.encodeToString(saida.toByteArray(), Base64.NO_WRAP)
  }

  private fun drawableParaBitmap(drawable: Drawable): Bitmap {
    if (drawable is BitmapDrawable) {
      return drawable.bitmap
    }
    val largura = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else TAMANHO_ICONE_PX
    val altura = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else TAMANHO_ICONE_PX
    val bitmap = Bitmap.createBitmap(largura, altura, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
  }

  companion object {
    const val NOME = "RootoraAccessibility"
    const val TAMANHO_ICONE_PX = 96
  }
}
