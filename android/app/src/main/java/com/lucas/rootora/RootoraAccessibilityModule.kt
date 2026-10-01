package com.lucas.rootora

import android.content.ComponentName
import android.content.Intent
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

/**
 * Ponte nativa <-> JS pra parte de acessibilidade e bloqueio de apps. Módulo
 * no estilo legado (ReactContextBaseJavaModule) — funciona sob a New
 * Architecture pela camada de interop do RN 0.87, sem codegen.
 *
 * isAccessibilityServiceEnabled/openAccessibilitySettings + as gravações em
 * SharedPreferences (regrasBloqueio, snapshot do dia, sessão ativa,
 * liberação temporária) — mais a emissão de eventos de troca de app, via
 * RootoraAccessibilityService.
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
   * Reabre packageName depois de um desbloqueio — o usuário não deve
   * precisar sair do Rootora manualmente pra voltar ao app que queria usar.
   * Resolve false (sem lançar) se o app não tiver mais um Launch Intent
   * (ex: foi desinstalado nesse meio tempo) — a tela de bloqueio já
   * concedeu o desbloqueio de qualquer forma, então isso nunca deve travar
   * nem mostrar erro.
   */
  @ReactMethod
  fun abrirApp(packageName: String, promise: Promise) {
    val intent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
    if (intent == null) {
      promise.resolve(false)
      return
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
    promise.resolve(true)
  }

  /**
   * Espelha o snapshot do dia em SharedPreferences (ver BloqueioPrefs) —
   * falha silenciosa: um JSON malformado não derruba o app, e o snapshot
   * sincroniza de novo na próxima mudança de tarefas.
   */
  @ReactMethod
  fun salvarSnapshotDoDia(snapshotJson: String) {
    try {
      BloqueioPrefs.salvarSnapshotDia(reactApplicationContext, snapshotJson)
    } catch (erro: Exception) {
      // Não crítico — ver comentário da função.
    }
  }

  /** Espelha regrasBloqueio em SharedPreferences — mesmo racional acima. */
  @ReactMethod
  fun salvarRegrasBloqueio(regrasJson: String) {
    try {
      BloqueioPrefs.salvarRegrasBloqueio(reactApplicationContext, regrasJson)
    } catch (erro: Exception) {
      // Não crítico — ver comentário da função.
    }
  }

  /**
   * Espelha regrasBloqueioPendentes em SharedPreferences — `null` limpa a
   * pendência do lado nativo (gravação direta ou "Cancelar alteração").
   * Mesma postura de falha silenciosa das outras gravações deste módulo.
   */
  @ReactMethod
  fun salvarRegrasBloqueioPendentes(pendenteJson: String?) {
    try {
      BloqueioPrefs.salvarRegrasBloqueioPendentes(reactApplicationContext, pendenteJson)
    } catch (erro: Exception) {
      // Não crítico — ver comentário da função.
    }
  }

  /**
   * Apps com Launcher Intent, resolvidos via `<queries>` (manifest,
   * MAIN/LAUNCHER) — não QUERY_ALL_PACKAGES. Exclui o próprio Rootora da
   * lista (não faz sentido bloquear a si mesmo) e deduplica por
   * packageName (alguns apps expõem mais de uma activity MAIN/LAUNCHER).
   */
  @ReactMethod
  fun listarAppsInstalados(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val resolvidos = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
      val meuPacote = reactApplicationContext.packageName
      val vistos = HashSet<String>()

      val lista = Arguments.createArray()
      for (resolvido in resolvidos) {
        val pacote = resolvido.activityInfo.packageName
        if (pacote == meuPacote || !vistos.add(pacote)) {
          continue
        }

        val mapa = Arguments.createMap()
        mapa.putString("packageName", pacote)
        mapa.putString("nome", resolvido.loadLabel(pm).toString())
        mapa.putString("iconeBase64", iconeParaBase64(resolvido.loadIcon(pm)))
        lista.pushMap(mapa)
      }

      promise.resolve(lista)
    } catch (erro: Exception) {
      promise.reject("LISTAR_APPS_FAILED", erro)
    }
  }

  private fun iconeParaBase64(drawable: Drawable): String {
    val bitmap = drawableParaBitmap(drawable)
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
    return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
  }

  private fun drawableParaBitmap(drawable: Drawable): Bitmap {
    if (drawable is BitmapDrawable) {
      return drawable.bitmap
    }
    val largura = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 1
    val altura = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 1
    val bitmap = Bitmap.createBitmap(largura, altura, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
  }

  /**
   * Marca a sessão de foco em andamento — ver BloqueioPrefs.salvarSessaoAtiva.
   * Mesma postura de falha silenciosa das outras gravações deste módulo.
   */
  @ReactMethod
  fun salvarSessaoAtiva(sessaoJson: String) {
    try {
      BloqueioPrefs.salvarSessaoAtiva(reactApplicationContext, sessaoJson)
    } catch (erro: Exception) {
      // Não crítico — ver comentário da função.
    }
  }

  @ReactMethod
  fun limparSessaoAtiva() {
    BloqueioPrefs.limparSessaoAtiva(reactApplicationContext)
  }

  companion object {
    const val NOME = "RootoraAccessibility"
  }
}
