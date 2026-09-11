package com.lucas.rootora

import android.content.Context
import java.util.Calendar

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
