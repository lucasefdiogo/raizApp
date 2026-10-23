package com.luxthorapps.rootora

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
import com.facebook.react.bridge.ReadableArray
import java.io.ByteArrayOutputStream

/**
 * Ponte nativa <-> JS pra parte de acessibilidade e bloqueio de apps. Módulo
 * no estilo legado (ReactContextBaseJavaModule) — funciona sob a New
 * Architecture pela camada de interop do RN 0.87, sem codegen.
 *
 * isAccessibilityServiceEnabled/openAccessibilitySettings + as gravações em
 * SharedPreferences (regrasBloqueio, snapshot do dia, sessão ativa) e as
 * ações do saldo diário de blocos (liberar sessão) — mais a emissão de eventos de troca de app, via
 * RootoraAccessibilityService.
 */
class RootoraAccessibilityModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NOME

  @ReactMethod
  fun isAccessibilityServiceEnabled(promise: Promise) {
    try {
      promise.resolve(servicoAcessibilidadeHabilitado())
    } catch (erro: Exception) {
      promise.reject("ACCESSIBILITY_CHECK_FAILED", erro)
    }
  }

  private fun servicoAcessibilidadeHabilitado(): Boolean {
    val resolver = reactApplicationContext.contentResolver

    val habilitadoGlobal =
      Settings.Secure.getInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1
    if (!habilitadoGlobal) {
      return false
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
    return servicosHabilitados.split(':').any { entrada ->
      entrada.equals(nosso.flattenToString(), ignoreCase = true) ||
        entrada.equals(nosso.flattenToShortString(), ignoreCase = true)
    }
  }

  /** Unsent service on/off events, oldest first, as [{ id, tipo, em }] (contract: src/native/EventosAcessibilidade.ts). */
  @ReactMethod
  fun lerEventosAcessibilidadePendentes(promise: Promise) {
    try {
      val lista = Arguments.createArray()
      for (evento in AvisoDesligamentoPrefs.lerPendentes(reactApplicationContext)) {
        val mapa = Arguments.createMap()
        mapa.putString("id", evento.id)
        mapa.putString("tipo", evento.tipo)
        mapa.putString("em", evento.em)
        lista.pushMap(mapa)
      }
      promise.resolve(lista)
    } catch (erro: Exception) {
      promise.reject("LER_EVENTOS_ACESSIBILIDADE_FAILED", erro)
    }
  }

  @ReactMethod
  fun marcarEventosAcessibilidadeEnviados(ids: ReadableArray, promise: Promise) {
    try {
      val lista = (0 until ids.size()).mapNotNull { ids.getString(it) }
      AvisoDesligamentoPrefs.marcarEnviados(reactApplicationContext, lista)
      promise.resolve(null)
    } catch (erro: Exception) {
      promise.reject("MARCAR_EVENTOS_ACESSIBILIDADE_FAILED", erro)
    }
  }

  /** RN-06: covers kills where onUnbind never ran; does not duplicate a shutdown already recorded. */
  @ReactMethod
  fun verificarDesligamentoNaAbertura(promise: Promise) {
    try {
      AvisoDesligamentoPrefs.registrarDesligamentoNaAbertura(
        reactApplicationContext,
        !servicoAcessibilidadeHabilitado(),
      )
      promise.resolve(null)
    } catch (erro: Exception) {
      promise.reject("VERIFICAR_DESLIGAMENTO_FAILED", erro)
    }
  }

  /** Mirrors the user's `notificacoesAtivas` setting for the native reminder (RN-03). */
  @ReactMethod
  fun espelharNotificacoesAtivas(ativas: Boolean) {
    try {
      AvisoDesligamentoPrefs.salvarNotificacoesAtivas(reactApplicationContext, ativas)
    } catch (erro: Exception) {
      // Not critical: mirrored again on the next change.
    }
  }

  /** Destination left by a tapped reminder (e.g. "bloqueio-apps") or null; cleared on read. */
  @ReactMethod
  fun consumirDestinoNotificacao(promise: Promise) {
    try {
      promise.resolve(AvisoDesligamentoPrefs.consumirDestinoPendente(reactApplicationContext))
    } catch (erro: Exception) {
      promise.reject("CONSUMIR_DESTINO_FAILED", erro)
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
   * Estado do saldo diário já reconciliado com o relógio (JSON com `estado`,
   * `config` e `agora` — ver SaldoBloqueioPrefs.visaoJson). Fonte da verdade
   * da InterceptScreen: a regra vive no Kotlin, o JS só desenha.
   */
  @ReactMethod
  fun obterEstadoBloqueio(promise: Promise) {
    try {
      promise.resolve(SaldoBloqueioPrefs.visaoJson(reactApplicationContext))
    } catch (erro: Exception) {
      promise.reject("ESTADO_BLOQUEIO_FAILED", erro)
    }
  }

  /** Fim da pausa de intenção. Resolve true se o bloco foi aberto (false = nada a liberar no estado atual). */
  @ReactMethod
  fun liberarBloco(promise: Promise) = transicionar(promise) { s, cfg, agora, dia ->
    SaldoBloqueioMaquina.liberarBloco(s, cfg, agora, dia)
  }

  /** Fim da espera de 5 s do acesso rápido. Resolve JSON `{aceito, visao}`; aceito=false se cota/intervalo/sessão impedem. */
  @ReactMethod
  fun liberarAcessoRapido(promise: Promise) = transicionarComVisao(promise) { s, cfg, agora, dia ->
    SaldoBloqueioMaquina.liberarAcessoRapido(s, cfg, agora, dia)
  }

  /** Fim da respiração de 60 s da emergência. Resolve JSON `{aceito, visao}`; não consome a cota do acesso rápido. */
  @ReactMethod
  fun concluirEmergencia(promise: Promise) = transicionarComVisao(promise) { s, cfg, agora, dia ->
    SaldoBloqueioMaquina.concluirEmergencia(s, cfg, agora, dia)
  }

  private fun transicionarComVisao(
    promise: Promise,
    transicao: (EstadoSaldo, ConfigBloco, Long, String) -> ResultadoTransicao,
  ) {
    try {
      promise.resolve(SaldoBloqueioPrefs.transicionarComVisaoJson(reactApplicationContext, transicao))
    } catch (erro: Exception) {
      promise.reject("TRANSICAO_BLOQUEIO_FAILED", erro)
    }
  }

  private fun transicionar(
    promise: Promise,
    transicao: (EstadoSaldo, ConfigBloco, Long, String) -> ResultadoTransicao,
  ) {
    try {
      promise.resolve(SaldoBloqueioPrefs.transicionar(reactApplicationContext, transicao).ok)
    } catch (erro: Exception) {
      promise.reject("TRANSICAO_BLOQUEIO_FAILED", erro)
    }
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
      // Essencial cumprido / tarefa extra nova rendem saldo — ver SaldoBloqueioMaquina.aplicarSnapshot.
      SaldoBloqueioPrefs.aplicarSnapshotJson(reactApplicationContext, snapshotJson)
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

  /** Espelha rotina em SharedPreferences (HU-10, RN16) — mesmo racional acima. */
  @ReactMethod
  fun salvarRotina(rotinaJson: String) {
    try {
      BloqueioPrefs.salvarRotina(reactApplicationContext, rotinaJson)
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
