package com.lucas.rootora

import android.content.Context
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

/**
 * Espelho, em SharedPreferences, da config de bloqueio de apps que vive no
 * Firestore (users/{uid}.bloqueioApps) — ponte única entre o módulo nativo
 * (grava, a partir do JS, via RootoraAccessibilityModule.syncBloqueioConfig
 * e registrarDesbloqueioTemporario) e o RootoraAccessibilityService (lê, a
 * cada troca de app, fora do ciclo de vida do React). Mantido num objeto só
 * pra não duplicar as chaves entre os dois arquivos.
 */
object BloqueioPrefs {
  private const val PREFS_NOME = "rootora_bloqueio_apps"
  private const val CHAVE_ATIVO = "ativo"
  private const val CHAVE_APPS = "apps_selecionados"
  private const val CHAVE_INICIO = "horario_inicio"
  private const val CHAVE_FIM = "horario_fim"
  private const val PREFIXO_DESBLOQUEIO = "unlock_"
  private const val CHAVE_SNAPSHOT_DIA = "snapshot_dia"
  private const val CHAVE_REGRAS_BLOQUEIO = "regras_bloqueio"
  private const val CHAVE_SESSAO_ATIVA = "sessao_ativa"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)

  fun salvarConfig(
    context: Context,
    ativo: Boolean,
    appsSelecionados: List<String>,
    horarioInicio: String?,
    horarioFim: String?,
  ) {
    prefs(context)
      .edit()
      .putBoolean(CHAVE_ATIVO, ativo)
      .putStringSet(CHAVE_APPS, appsSelecionados.toSet())
      .putString(CHAVE_INICIO, horarioInicio)
      .putString(CHAVE_FIM, horarioFim)
      .apply()
  }

  fun registrarDesbloqueioTemporario(context: Context, packageName: String, minutos: Int) {
    val expiraEm = System.currentTimeMillis() + minutos * 60_000L
    prefs(context).edit().putLong(PREFIXO_DESBLOQUEIO + packageName, expiraEm).apply()
  }

  /**
   * Snapshot do dia (JSON bruto, formato de domain/intercept.ts SnapshotDia)
   * — gravado a cada mudança em tarefas[] pelo lado JS (ver
   * RootoraAccessibilityModule.salvarSnapshotDoDia). Lido pela
   * InterceptActivity (Etapa 4) como `initialProps.snapshot`, sem round-trip
   * ao Firestore no caminho crítico de abrir a tela.
   */
  fun salvarSnapshotDia(context: Context, snapshotJson: String) {
    prefs(context).edit().putString(CHAVE_SNAPSHOT_DIA, snapshotJson).apply()
  }

  fun lerSnapshotDia(context: Context): String? = prefs(context).getString(CHAVE_SNAPSHOT_DIA, null)

  /**
   * Regras de bloqueio vigentes (JSON bruto, formato de domain/types.ts
   * RegrasBloqueio) — ainda sem nenhum gravador real do lado JS (ver
   * comentário em AccessibilityDetection.salvarRegrasBloqueio).
   */
  fun salvarRegrasBloqueio(context: Context, regrasJson: String) {
    prefs(context).edit().putString(CHAVE_REGRAS_BLOQUEIO, regrasJson).apply()
  }

  fun lerRegrasBloqueio(context: Context): String? = prefs(context).getString(CHAVE_REGRAS_BLOQUEIO, null)

  /**
   * Sessão de foco em andamento (JSON bruto, formato de
   * SessaoAtivaNativa em native/AccessibilityDetection.ts) — gravada pelo
   * useFocusSession enquanto fase === 'contando' (só quando origem ===
   * 'interceptacao'). Usada pelo RootoraAccessibilityService pra reabrir a
   * InterceptActivity direto na SessaoFocoScreen em vez da decisão A/B/C
   * quando o pacote é redetectado com o timer ainda rodando.
   */
  fun salvarSessaoAtiva(context: Context, sessaoJson: String) {
    prefs(context).edit().putString(CHAVE_SESSAO_ATIVA, sessaoJson).apply()
  }

  fun limparSessaoAtiva(context: Context) {
    prefs(context).edit().remove(CHAVE_SESSAO_ATIVA).apply()
  }

  fun lerSessaoAtiva(context: Context): String? = prefs(context).getString(CHAVE_SESSAO_ATIVA, null)

  /**
   * As 4 condições do bloqueio (ver spec da tarefa): ativo, app
   * selecionado, dentro do horário e sem desbloqueio temporário vigente
   * pra esse pacote.
   */
  fun deveBloquear(context: Context, packageName: String): Boolean {
    val p = prefs(context)

    if (!p.getBoolean(CHAVE_ATIVO, false)) {
      return false
    }

    val apps = p.getStringSet(CHAVE_APPS, emptySet()) ?: emptySet()
    if (packageName !in apps) {
      return false
    }

    val inicio = p.getString(CHAVE_INICIO, null)
    val fim = p.getString(CHAVE_FIM, null)
    if (inicio == null || fim == null || !dentroDoHorario(inicio, fim)) {
      return false
    }

    val expiraEm = p.getLong(PREFIXO_DESBLOQUEIO + packageName, 0L)
    return System.currentTimeMillis() >= expiraEm
  }

  /**
   * Equivalente de deveBloquear, mas lendo `regrasBloqueio` (schema novo,
   * seção 6/7 da spec 09-ponte-fuga-tarefa — apps[] + janelas[] com
   * diasSemana) em vez de `bloqueioApps`. Compartilha o MESMO
   * PREFIXO_DESBLOQUEIO de deveBloquear: uma liberação concedida por
   * qualquer um dos dois caminhos (AppBlockedScreen ou InterceptScreen)
   * vale pro outro também — nunca duplica o estado de "liberado até".
   *
   * Sem nenhuma tela gravando `regrasBloqueio` ainda (ver
   * AccessibilityDetection.salvarRegrasBloqueio), isso fica sempre false
   * na prática — construído e testável via InterceptDebugScreen, mas
   * inerte num device real até essa tela existir. Decisão registrada na
   * Etapa 4 da tarefa: caminho paralelo, nunca substitui deveBloquear.
   *
   * Simplificação aceita: diferente de dentroDoHorario (uma janela só,
   * sem dia da semana), aqui uma janela que atravessa a meia-noite só
   * "conta" pro dia em que ELA COMEÇA — não tenta herdar o dia anterior
   * pra cobrir a madrugada. Cenário raro (a pessoa mexendo no bloqueio às
   * 23h) e sem consequência hoje, já que nada popula regrasBloqueio.
   */
  fun deveInterceptar(context: Context, packageName: String): Boolean {
    val json = lerRegrasBloqueio(context) ?: return false
    val regras =
      try {
        JSONObject(json)
      } catch (erro: Exception) {
        return false
      }

    val apps = regras.optJSONArray("apps") ?: JSONArray()
    val appsList = (0 until apps.length()).map { apps.optString(it) }
    if (packageName !in appsList) {
      return false
    }

    val janelas = regras.optJSONArray("janelas") ?: JSONArray()
    if (!dentroDeAlgumaJanela(janelas)) {
      return false
    }

    val expiraEm = prefs(context).getLong(PREFIXO_DESBLOQUEIO + packageName, 0L)
    return System.currentTimeMillis() >= expiraEm
  }

  /** 0 = domingo, segue a convenção de Date.getDay() do JS (ver domain/types.ts). */
  private fun dentroDeAlgumaJanela(janelas: JSONArray): Boolean {
    val agora = Calendar.getInstance()
    val diaSemanaAtual = agora.get(Calendar.DAY_OF_WEEK) - 1
    val minutosAgora = agora.get(Calendar.HOUR_OF_DAY) * 60 + agora.get(Calendar.MINUTE)

    for (i in 0 until janelas.length()) {
      val janela = janelas.optJSONObject(i) ?: continue
      val minutosInicio = paraMinutos(janela.optString("inicio", "")) ?: continue
      val minutosFim = paraMinutos(janela.optString("fim", "")) ?: continue
      val diasSemana = janela.optJSONArray("diasSemana") ?: JSONArray()
      val diasList = (0 until diasSemana.length()).map { diasSemana.optInt(it) }

      if (diaSemanaAtual !in diasList) {
        continue
      }

      val dentro =
        if (minutosInicio <= minutosFim) {
          minutosAgora in minutosInicio..minutosFim
        } else {
          minutosAgora >= minutosInicio || minutosAgora <= minutosFim
        }
      if (dentro) {
        return true
      }
    }
    return false
  }

  /**
   * Trata o caso de a janela atravessar a meia-noite (ex: 22:00-06:00) —
   * sem isso, uma configuração assim nunca bloquearia nada.
   */
  private fun dentroDoHorario(inicio: String, fim: String): Boolean {
    val minutosInicio = paraMinutos(inicio) ?: return false
    val minutosFim = paraMinutos(fim) ?: return false

    val agora = Calendar.getInstance()
    val minutosAgora = agora.get(Calendar.HOUR_OF_DAY) * 60 + agora.get(Calendar.MINUTE)

    return if (minutosInicio <= minutosFim) {
      minutosAgora in minutosInicio..minutosFim
    } else {
      minutosAgora >= minutosInicio || minutosAgora <= minutosFim
    }
  }

  private fun paraMinutos(horario: String): Int? {
    val partes = horario.split(":")
    if (partes.size != 2) {
      return null
    }
    val horas = partes[0].toIntOrNull() ?: return null
    val minutos = partes[1].toIntOrNull() ?: return null
    return horas * 60 + minutos
  }
}
