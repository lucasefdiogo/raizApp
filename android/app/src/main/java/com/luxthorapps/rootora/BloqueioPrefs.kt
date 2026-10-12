package com.luxthorapps.rootora

import android.content.Context
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

/**
 * Espelho, em SharedPreferences, das regras de bloqueio de apps que vivem no
 * Firestore (users/{uid}.regrasBloqueio) — ponte única entre o módulo
 * nativo (grava, a partir do JS, via RootoraAccessibilityModule) e o
 * RootoraAccessibilityService (lê, a cada troca de app, fora do ciclo de
 * vida do React). Mantido num objeto só pra não duplicar as chaves entre os
 * dois arquivos.
 */
object BloqueioPrefs {
  private const val PREFS_NOME = "rootora_bloqueio_apps"
  private const val CHAVE_SNAPSHOT_DIA = "snapshot_dia"
  private const val CHAVE_REGRAS_BLOQUEIO = "regras_bloqueio"
  private const val CHAVE_REGRAS_BLOQUEIO_PENDENTES = "regras_bloqueio_pendentes"
  private const val CHAVE_SESSAO_ATIVA = "sessao_ativa"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)

  /**
   * Snapshot do dia (JSON bruto, formato de domain/intercept.ts SnapshotDia)
   * — gravado a cada mudança em tarefas[] pelo lado JS (ver
   * RootoraAccessibilityModule.salvarSnapshotDoDia). Lido pela
   * InterceptActivity como `initialProps.snapshot`, sem round-trip ao
   * Firestore no caminho crítico de abrir a tela.
   */
  fun salvarSnapshotDia(context: Context, snapshotJson: String) {
    prefs(context).edit().putString(CHAVE_SNAPSHOT_DIA, snapshotJson).apply()
  }

  fun lerSnapshotDia(context: Context): String? = prefs(context).getString(CHAVE_SNAPSHOT_DIA, null)

  /**
   * Regras de bloqueio vigentes (JSON bruto, formato de domain/types.ts
   * RegrasBloqueio).
   */
  fun salvarRegrasBloqueio(context: Context, regrasJson: String) {
    prefs(context).edit().putString(CHAVE_REGRAS_BLOQUEIO, regrasJson).apply()
  }

  fun lerRegrasBloqueio(context: Context): String? = prefs(context).getString(CHAVE_REGRAS_BLOQUEIO, null)

  /**
   * Alteração ainda não vigente (JSON bruto, formato de
   * domain/types.ts RegrasBloqueioPendentes — inclui `efetivaEm`). `null`
   * apaga a pendência (gravação direta ou "Cancelar alteração" na tela).
   */
  fun salvarRegrasBloqueioPendentes(context: Context, pendenteJson: String?) {
    val editor = prefs(context).edit()
    if (pendenteJson == null) {
      editor.remove(CHAVE_REGRAS_BLOQUEIO_PENDENTES)
    } else {
      editor.putString(CHAVE_REGRAS_BLOQUEIO_PENDENTES, pendenteJson)
    }
    editor.apply()
  }

  fun lerRegrasBloqueioPendentes(context: Context): String? =
    prefs(context).getString(CHAVE_REGRAS_BLOQUEIO_PENDENTES, null)

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

  /** `packageName` está em `regrasBloqueio.apps` (vigente, já com pendência promovida se vencida). */
  fun ehAppBloqueado(context: Context, packageName: String): Boolean {
    promoverPendentesSeVencidas(context)

    val json = lerRegrasBloqueio(context) ?: return false
    val regras =
      try {
        JSONObject(json)
      } catch (erro: Exception) {
        return false
      }

    val apps = regras.optJSONArray("apps") ?: JSONArray()
    return (0 until apps.length()).any { apps.optString(it) == packageName }
  }

  private fun dentroDaJanelaVigente(context: Context): Boolean {
    val json = lerRegrasBloqueio(context) ?: return false
    val regras =
      try {
        JSONObject(json)
      } catch (erro: Exception) {
        return false
      }
    return dentroDeAlgumaJanela(regras.optJSONArray("janelas") ?: JSONArray())
  }

  /**
   * Único caminho de interceptação — lê `regrasBloqueio` (apps[] + janelas[]
   * com diasSemana) e o estado do saldo diário (SaldoBloqueioPrefs): app
   * bloqueado, dentro da janela e SEM bloco/tolerância em andamento. Quem
   * libera o uso é a máquina de estados (liberarBloco/usarTolerancia), não
   * mais um desbloqueio temporário por pacote.
   *
   * Simplificação aceita: uma janela que atravessa a meia-noite só "conta"
   * pro dia em que ELA COMEÇA — não tenta herdar o dia anterior pra cobrir
   * a madrugada.
   */
  fun deveInterceptar(context: Context, packageName: String): Boolean {
    if (!ehAppBloqueado(context, packageName)) {
      return false
    }
    if (!dentroDaJanelaVigente(context)) {
      return false
    }
    return !SaldoBloqueioMaquina.permiteUso(SaldoBloqueioPrefs.estadoAtual(context))
  }

  /**
   * Promove `regrasBloqueioPendentes` pra `regrasBloqueio` quando hoje (data
   * local do aparelho) já alcançou `efetivaEm` — mesma regra de
   * domain/appBlock.ts aplicarRegrasBloqueioPendentesSeVencidas,
   * reimplementada aqui porque o Service roda sem JS (o app pode estar
   * completamente fechado quando o usuário abre o app que seria
   * interceptado). Chamada no início de deveInterceptar, antes de ler as
   * regras vigentes — idempotente: sem pendência, ou com pendência ainda
   * não vencida, não faz nada.
   */
  fun promoverPendentesSeVencidas(context: Context) {
    val pendenteJson = lerRegrasBloqueioPendentes(context) ?: return
    val pendente =
      try {
        JSONObject(pendenteJson)
      } catch (erro: Exception) {
        return
      }

    val efetivaEm = pendente.optString("efetivaEm", "")
    if (efetivaEm.isEmpty() || hojeLocalISO() < efetivaEm) {
      return
    }

    // Tudo menos `efetivaEm` (apps, janelas e a config de blocos, se houver).
    val novaVigente = JSONObject()
    pendente.keys().forEach { chave ->
      if (chave != "efetivaEm") {
        novaVigente.put(chave, pendente.get(chave))
      }
    }
    if (!novaVigente.has("apps")) novaVigente.put("apps", JSONArray())
    if (!novaVigente.has("janelas")) novaVigente.put("janelas", JSONArray())
    salvarRegrasBloqueio(context, novaVigente.toString())
    salvarRegrasBloqueioPendentes(context, null)
  }

  /** YYYY-MM-DD local do aparelho — mesmo formato de domain/data.ts paraISOLocal. */
  private fun hojeLocalISO(): String {
    val agora = Calendar.getInstance()
    val ano = agora.get(Calendar.YEAR)
    val mes = agora.get(Calendar.MONTH) + 1
    val dia = agora.get(Calendar.DAY_OF_MONTH)
    return String.format("%04d-%02d-%02d", ano, mes, dia)
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
