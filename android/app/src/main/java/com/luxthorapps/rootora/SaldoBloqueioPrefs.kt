package com.luxthorapps.rootora

import android.content.Context
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persistência (SharedPreferences, sobrevive a fechar o app e reiniciar o
 * aparelho) + serialização JSON do EstadoSaldo, e o ÚNICO ponto de entrada
 * que o Service/Module usam pra mexer na máquina. Todo acesso é sincronizado
 * (`@Synchronized`): Service (thread principal) e Module (thread do bridge)
 * fazem read-modify-write do mesmo estado. Sem lógica de regra aqui — ela
 * vive em SaldoBloqueioMaquina.
 */
object SaldoBloqueioPrefs {
  private const val PREFS_NOME = "rootora_saldo_bloqueio"
  private const val CHAVE_ESTADO = "estado"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)

  /** YYYY-MM-DD local do aparelho — mesmo formato de domain/data.ts paraISOLocal. */
  fun hojeLocalISO(): String {
    val agora = Calendar.getInstance()
    return String.format(
      "%04d-%02d-%02d",
      agora.get(Calendar.YEAR),
      agora.get(Calendar.MONTH) + 1,
      agora.get(Calendar.DAY_OF_MONTH),
    )
  }

  /** Config das regras vigentes; campo ausente/inválido = padrão (ver CONFIG_BLOCO_PADRAO no TS). */
  fun configDasRegras(regrasJson: String?): ConfigBloco {
    val padrao = ConfigBloco()
    if (regrasJson == null) {
      return padrao
    }
    return try {
      val r = JSONObject(regrasJson)
      fun campo(nome: String, padraoValor: Int): Int {
        val valor = r.optInt(nome, -1)
        return if (r.has(nome) && valor >= 0) valor else padraoValor
      }
      ConfigBloco(
        duracaoBlocoMin = campo("duracaoBlocoMin", padrao.duracaoBlocoMin),
        toleranciaMin = campo("toleranciaMin", padrao.toleranciaMin),
        cooldownMin = campo("cooldownMin", padrao.cooldownMin),
        blocosDiarios = if (r.has("blocosDiarios") && r.optInt("blocosDiarios", -1) >= 0) r.getInt("blocosDiarios") else null,
        blocoPorTarefaExtra = campo("blocoPorTarefaExtra", padrao.blocoPorTarefaExtra),
      )
    } catch (erro: Exception) {
      padrao
    }
  }

  fun paraJson(s: EstadoSaldo): JSONObject =
    JSONObject().apply {
      put("dia", s.dia)
      put("fase", s.fase.name)
      put("saldo", s.saldo)
      put("blocosUsados", s.blocosUsados)
      put("toleranciasUsadas", s.toleranciasUsadas)
      put("essencialCreditado", s.essencialCreditado)
      put("extrasCreditadas", JSONArray(s.extrasCreditadas))
      put("consumidoMs", s.consumidoMs)
      put("toleranciaUsada", s.toleranciaUsada)
      put("toleranciaAtiva", s.toleranciaAtiva)
      put("fimCooldownEm", s.fimCooldownEm)
      put("fgDesde", s.fgDesde)
    }

  fun deJson(json: String, diaPadrao: String): EstadoSaldo =
    try {
      val o = JSONObject(json)
      val extras = o.optJSONArray("extrasCreditadas") ?: JSONArray()
      EstadoSaldo(
        dia = o.optString("dia", diaPadrao),
        fase = FaseBloqueio.valueOf(o.optString("fase", FaseBloqueio.BLOQUEADO_SEM_ESSENCIAL.name)),
        saldo = o.optInt("saldo", 0),
        blocosUsados = o.optInt("blocosUsados", 0),
        toleranciasUsadas = o.optInt("toleranciasUsadas", 0),
        essencialCreditado = o.optBoolean("essencialCreditado", false),
        extrasCreditadas = (0 until extras.length()).map { extras.optString(it) },
        consumidoMs = o.optLong("consumidoMs", 0L),
        toleranciaUsada = o.optBoolean("toleranciaUsada", false),
        toleranciaAtiva = o.optBoolean("toleranciaAtiva", false),
        fimCooldownEm = o.optLong("fimCooldownEm", 0L),
        fgDesde = o.optLong("fgDesde", 0L),
      )
    } catch (erro: Exception) {
      EstadoSaldo(dia = diaPadrao)
    }

  private fun ler(context: Context, dia: String): EstadoSaldo {
    val json = prefs(context).getString(CHAVE_ESTADO, null) ?: return EstadoSaldo(dia = dia)
    return deJson(json, dia)
  }

  private fun gravar(context: Context, estado: EstadoSaldo) {
    prefs(context).edit().putString(CHAVE_ESTADO, paraJson(estado).toString()).apply()
  }

  private fun config(context: Context): ConfigBloco {
    BloqueioPrefs.promoverPendentesSeVencidas(context)
    return configDasRegras(BloqueioPrefs.lerRegrasBloqueio(context))
  }

  /** Aplica `transicao` sobre o estado persistido, grava e devolve o resultado. */
  @Synchronized
  fun transicionar(
    context: Context,
    transicao: (EstadoSaldo, ConfigBloco, Long, String) -> ResultadoTransicao,
  ): ResultadoTransicao {
    val agora = System.currentTimeMillis()
    val dia = hojeLocalISO()
    val cfg = config(context)
    val resultado = transicao(ler(context, dia), cfg, agora, dia)
    gravar(context, resultado.estado)
    return resultado
  }

  /** Estado já reconciliado com o relógio atual (e gravado, pra não repetir a conta). */
  @Synchronized
  fun estadoAtual(context: Context): EstadoSaldo =
    transicionar(context) { s, cfg, agora, dia ->
      ResultadoTransicao(SaldoBloqueioMaquina.reconciliar(s, cfg, agora, dia), true)
    }.estado

  @Synchronized
  fun configAtual(context: Context): ConfigBloco = config(context)

  /**
   * O que o RN precisa pra desenhar a tela: estado já reconciliado + config
   * vigente + `agora` do aparelho (a contagem regressiva do JS parte dele,
   * não do relógio do JS). Mesmo formato dos extras da InterceptActivity e do
   * retorno de RootoraAccessibilityModule.obterEstadoBloqueio.
   */
  @Synchronized
  fun visaoJson(context: Context): String {
    val estado = estadoAtual(context)
    val cfg = config(context)
    return JSONObject()
      .apply {
        put("estado", paraJson(estado))
        put(
          "config",
          JSONObject().apply {
            put("duracaoBlocoMin", cfg.duracaoBlocoMin)
            put("toleranciaMin", cfg.toleranciaMin)
            put("cooldownMin", cfg.cooldownMin)
            cfg.blocosDiarios?.let { put("blocosDiarios", it) }
            put("blocoPorTarefaExtra", cfg.blocoPorTarefaExtra)
          },
        )
        put("agora", System.currentTimeMillis())
      }
      .toString()
  }

  /** Reinício do Service/processo: o trecho em primeiro plano em aberto é descartado (não dá pra saber quando acabou). */
  @Synchronized
  fun descartarTrechoEmAberto(context: Context) {
    transicionar(context) { s, _, _, _ -> ResultadoTransicao(s.copy(fgDesde = 0L), true) }
  }

  /** Snapshot do dia (JSON de domain/intercept.ts SnapshotDia) -> essencial cumprido + extras concluídas. */
  @Synchronized
  fun aplicarSnapshotJson(context: Context, snapshotJson: String): EstadoSaldo? {
    val tarefas =
      try {
        JSONObject(snapshotJson).optJSONArray("tarefas") ?: return null
      } catch (erro: Exception) {
        return null
      }

    var totalEssenciais = 0
    var essenciaisConcluidas = 0
    val extras = mutableListOf<String>()
    for (i in 0 until tarefas.length()) {
      val t = tarefas.optJSONObject(i) ?: continue
      val concluida = t.optBoolean("concluida", false)
      if (t.optBoolean("essencial", false)) {
        totalEssenciais++
        if (concluida) essenciaisConcluidas++
      } else if (concluida && (!t.has("tarefaPaiId") || t.isNull("tarefaPaiId"))) {
        extras.add(t.optString("id"))
      }
    }
    val essencialCumprido = totalEssenciais > 0 && essenciaisConcluidas == totalEssenciais

    return transicionar(context) { s, cfg, agora, dia ->
      SaldoBloqueioMaquina.aplicarSnapshot(s, essencialCumprido, extras, cfg, agora, dia)
    }.estado
  }
}
