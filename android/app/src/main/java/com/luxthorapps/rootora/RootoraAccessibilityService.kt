package com.luxthorapps.rootora

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import android.view.accessibility.AccessibilityEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

/**
 * Detecta qual app está em primeiro plano via TYPE_WINDOW_STATE_CHANGED.
 * Primeiro incremento (Fase 3, parte 1) só repassava isso pro lado JS pra
 * debug; a mesma detecção hoje também avalia a interceptação — ver
 * avaliarIntercept. Não lê conteúdo de tela
 * (canRetrieveWindowContent="false" no config) — só o nome do pacote.
 *
 * Também é o cronômetro do saldo diário de blocos (SaldoBloqueioMaquina): o
 * bloco só corre com um app bloqueado em PRIMEIRO PLANO — soma o trecho ao
 * trocar de janela ou apagar a tela, e agenda um aviso (Handler) pro momento
 * em que o bloco esgota com o app ainda aberto.
 */
class RootoraAccessibilityService : AccessibilityService() {

  private var ultimoPacote: String? = null

  /** App bloqueado cujo tempo está correndo agora (null = relógio do bloco parado). */
  private var pacoteBloqueadoEmFoco: String? = null

  private val handler = Handler(Looper.getMainLooper())
  private val aoEstourarBloco = Runnable { aoBlocoEstourar() }

  private val aoChegarAviso = Runnable { aoAvisarUmMinuto() }

  private val receiverTela =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        // Tela apagou: pausa o relógio. Ao acender, a primeira janela nova
        // reinicia a contagem (ultimoPacote zerado pra não ser deduplicada).
        pausarRelogio()
        ultimoPacote = null
      }
    }

  override fun onServiceConnected() {
    super.onServiceConnected()
    // Processo/serviço reiniciou: um trecho em aberto não tem fim conhecido.
    SaldoBloqueioPrefs.descartarTrechoEmAberto(applicationContext)
    registerReceiver(receiverTela, IntentFilter(Intent.ACTION_SCREEN_OFF))
    // RN-01: records the re-enable (if a shutdown was recorded) and marks "already activated".
    AvisoDesligamentoPrefs.registrarConexaoDoServico(applicationContext)
  }

  /** Service switched off by the user or the system: record the shutdown time (RN-01). */
  override fun onUnbind(intent: Intent?): Boolean {
    AvisoDesligamentoPrefs.registrarDesligamento(applicationContext)
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    handler.removeCallbacks(aoEstourarBloco)
    handler.removeCallbacks(aoChegarAviso)
    try {
      unregisterReceiver(receiverTela)
    } catch (erro: Exception) {
      // Nunca registrado (serviço destruído antes de conectar).
    }
    super.onDestroy()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      return
    }

    val pacote = event.packageName?.toString()
    if (pacote.isNullOrEmpty() || pacote == ultimoPacote) {
      return
    }
    // Teclado e barra de notificações abrem janela por cima do app sem o
    // usuário ter saído dele — contar como "saiu" pausaria o bloco enquanto
    // ele digita.
    if (ehJanelaDeSistema(pacote)) {
      return
    }

    ultimoPacote = pacote
    emitirParaJS(pacote)
    atualizarRelogio(pacote)
    avaliarIntercept(pacote)
  }

  private fun ehJanelaDeSistema(pacote: String): Boolean {
    if (pacote == "com.android.systemui") {
      return true
    }
    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    return imm?.enabledInputMethodList?.any { it.packageName == pacote } == true
  }

  /** Soma o trecho do app que saiu de foco e, se o novo for bloqueado, retoma o relógio. */
  private fun atualizarRelogio(pacote: String) {
    pausarRelogio()
    if (BloqueioPrefs.ehAppBloqueado(applicationContext, pacote)) {
      SaldoBloqueioPrefs.transicionar(applicationContext) { s, cfg, agora, dia ->
        SaldoBloqueioMaquina.entrouEmPrimeiroPlano(s, cfg, agora, dia)
      }
      pacoteBloqueadoEmFoco = pacote
      agendarEstouro()
      agendarAviso()
    }
  }

  private fun pausarRelogio() {
    handler.removeCallbacks(aoEstourarBloco)
    handler.removeCallbacks(aoChegarAviso)
    if (pacoteBloqueadoEmFoco != null) {
      SaldoBloqueioPrefs.transicionar(applicationContext) { s, cfg, agora, dia ->
        SaldoBloqueioMaquina.saiuDePrimeiroPlano(s, cfg, agora, dia)
      }
      pacoteBloqueadoEmFoco = null
    }
  }

  private fun agendarEstouro() {
    handler.removeCallbacks(aoEstourarBloco)
    val estado = SaldoBloqueioPrefs.estadoAtual(applicationContext)
    val cfg = SaldoBloqueioPrefs.configAtual(applicationContext)
    val agora = System.currentTimeMillis()
    // O que esgotar primeiro: a sessão ou a liberação rápida de 2 min (o cooldown e a cota não mudam).
    val faltam =
      listOfNotNull(
          SaldoBloqueioMaquina.msAteEsgotar(estado, cfg, agora),
          SaldoBloqueioMaquina.msAteEsgotarLiberacaoRapida(estado, agora),
        )
        .minOrNull() ?: return
    handler.postDelayed(aoEstourarBloco, faltam + 50L)
  }

  /** RN-04: agenda o toast de "1 minuto restante" (uma vez por sessão) enquanto o app bloqueado segue em primeiro plano. */
  private fun agendarAviso() {
    handler.removeCallbacks(aoChegarAviso)
    val estado = SaldoBloqueioPrefs.estadoAtual(applicationContext)
    val cfg = SaldoBloqueioPrefs.configAtual(applicationContext)
    val jaExibido =
      SaldoBloqueioPrefs.avisoSessaoExibido(applicationContext, SaldoBloqueioMaquina.chaveAvisoSessao(estado))
    val faltam =
      SaldoBloqueioMaquina.msParaAgendarAviso(estado, cfg, System.currentTimeMillis(), jaExibido) ?: return
    handler.postDelayed(aoChegarAviso, faltam)
  }

  private fun aoAvisarUmMinuto() {
    if (pacoteBloqueadoEmFoco == null) return
    val estado = SaldoBloqueioPrefs.estadoAtual(applicationContext)
    if (!SaldoBloqueioMaquina.permiteUso(estado)) return
    SaldoBloqueioPrefs.marcarAvisoSessaoExibido(applicationContext, SaldoBloqueioMaquina.chaveAvisoSessao(estado))
    Toast.makeText(applicationContext, "1 minuto restante", Toast.LENGTH_SHORT).show()
  }

  /** Sessão ou liberação rápida esgotou com o app ainda em primeiro plano: reconcilia (cooldown / encerra a liberação) e reabre a interceptação por cima dele. */
  private fun aoBlocoEstourar() {
    val pacote = pacoteBloqueadoEmFoco ?: return
    // reconciliar (dentro de estadoAtual) move pra COOLDOWN e zera o trecho em aberto.
    SaldoBloqueioPrefs.estadoAtual(applicationContext)
    avaliarIntercept(pacote)
  }

  /**
   * Único caminho de interceptação — lê `regrasBloqueio` espelhado em
   * SharedPreferences (não do Firestore — o serviço roda fora do ciclo de
   * vida do React, ver BloqueioPrefs) e, se as condições baterem, abre a
   * InterceptActivity por cima do app. `appLabel` é resolvido aqui (não
   * fica gravado no snapshot) porque só faz sentido no idioma/config atual
   * do sistema no momento exato da detecção.
   */
  private fun avaliarIntercept(pacote: String) {
    if (!BloqueioPrefs.deveInterceptar(applicationContext, pacote)) {
      return
    }

    val appLabel = resolverAppLabel(pacote)
    val snapshotJson = BloqueioPrefs.lerSnapshotDia(applicationContext) ?: "{\"tarefas\":[]}"
    val sessaoAtivaJson = sessaoAtivaValidaPara(pacote)

    val intent =
      Intent(applicationContext, InterceptActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        putExtra(InterceptActivity.EXTRA_PACKAGE_NAME, pacote)
        putExtra(InterceptActivity.EXTRA_APP_LABEL, appLabel)
        putExtra(InterceptActivity.EXTRA_SNAPSHOT_JSON, snapshotJson)
        putExtra(
          InterceptActivity.EXTRA_ESTADO_BLOQUEIO_JSON,
          SaldoBloqueioPrefs.visaoJson(applicationContext),
        )
        if (sessaoAtivaJson != null) {
          putExtra(InterceptActivity.EXTRA_SESSAO_ATIVA_JSON, sessaoAtivaJson)
        }
      }
    startActivity(intent)
  }

  private fun resolverAppLabel(pacote: String): String {
    return try {
      val pm = applicationContext.packageManager
      val info = pm.getApplicationInfo(pacote, PackageManager.GET_META_DATA)
      pm.getApplicationLabel(info).toString()
    } catch (erro: Exception) {
      pacote
    }
  }

  /**
   * Devolve o JSON da sessão ativa só se ela for de fato desse `pacote` e
   * ainda não tiver expirado — sem isso, a sessão de foco de um pacote
   * ficaria "vazando" pra reabrir a interceptação de outro, ou um timer já
   * encerrado reapareceria congelado em 0.
   */
  private fun sessaoAtivaValidaPara(pacote: String): String? {
    val json = BloqueioPrefs.lerSessaoAtiva(applicationContext) ?: return null
    return try {
      val sessao = JSONObject(json)
      val mesmoPacote = sessao.optString("packageName") == pacote
      val aindaValida = sessao.optLong("fimEm", 0L) > System.currentTimeMillis()
      if (mesmoPacote && aindaValida) json else null
    } catch (erro: Exception) {
      null
    }
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
