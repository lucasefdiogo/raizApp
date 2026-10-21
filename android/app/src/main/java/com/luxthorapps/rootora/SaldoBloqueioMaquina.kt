package com.luxthorapps.rootora

/**
 * Máquina de estados do saldo diário de sessões de uso dos apps bloqueados.
 * PURA de propósito (sem Context, sem JSON, sem relógio — `agora` e `dia`
 * entram por parâmetro): é o que o JUnit exercita. Esta é a AUTORIDADE da
 * regra (o AccessibilityService roda sem JS); src/domain/saldoBloqueio.ts é a
 * cópia espelhada, e as duas são validadas pelas MESMAS fixtures
 * (src/domain/__fixtures__/saldoBloqueio.json). Mexeu aqui, mexa lá e nas
 * fixtures.
 *
 * PAUSA_INTENCAO não existe aqui: é só estado de tela (reinicia se o usuário
 * sai), não há o que persistir. A sessão está disponível desde o início do
 * dia: nenhuma tarefa precisa ser feita para liberar. SALDO_ZERADO só existe
 * com blocosDiarios numérico.
 */
enum class FaseBloqueio {
  AGUARDANDO_LIBERACAO,
  SESSAO_ATIVA,
  COOLDOWN,
  SALDO_ZERADO,
  @Deprecated("compat temporário — removido na TASK-05") BLOQUEADO_SEM_ESSENCIAL,
  @Deprecated("compat temporário — removido na TASK-05") TOLERANCIA,
  @Deprecated("compat temporário — removido na TASK-05") BLOCO_ATIVO,
}

data class ConfigBloco(
  val duracaoBlocoMin: Int = 15,
  @Deprecated("compat temporário — removido na TASK-05") val toleranciaMin: Int = 0,
  val cooldownMin: Int = 45,
  /** null = sem limite de sessões por dia. */
  val blocosDiarios: Int? = null,
  val blocoPorTarefaExtra: Int = 1,
)

data class EstadoSaldo(
  /** YYYY-MM-DD local — virou o dia, tudo zera (reconciliar). */
  val dia: String,
  val fase: FaseBloqueio = FaseBloqueio.AGUARDANDO_LIBERACAO,
  /** Créditos de tarefas extras concluídas (soma ao limite diário em saldoDisponivel). */
  val saldo: Int = 0,
  val blocosUsados: Int = 0,
  @Deprecated("compat temporário — removido na TASK-05") val toleranciasUsadas: Int = 0,
  @Deprecated("compat temporário — removido na TASK-05") val essencialCreditado: Boolean = false,
  val extrasCreditadas: List<String> = emptyList(),
  /** Tempo em primeiro plano já gasto na sessão, sem contar o trecho aberto de `fgDesde`. */
  val consumidoMs: Long = 0L,
  @Deprecated("compat temporário — removido na TASK-05") val toleranciaUsada: Boolean = false,
  @Deprecated("compat temporário — removido na TASK-05") val toleranciaAtiva: Boolean = false,
  /** Epoch ms de quando o cooldown acaba (timestamp absoluto). */
  val fimCooldownEm: Long = 0L,
  /** Epoch ms de quando o app bloqueado entrou em primeiro plano; 0 = fora de primeiro plano. */
  val fgDesde: Long = 0L,
)

data class ResultadoTransicao(val estado: EstadoSaldo, val ok: Boolean)

object SaldoBloqueioMaquina {
  private const val MS_POR_MIN = 60_000L

  /** Duração da pausa de intenção por bloco já liberado no dia; o último valor é o teto. */
  val SEQUENCIA_PAUSA_INTENCAO_SEG_V2: List<Int> = listOf(10, 20, 30, 40, 50, 60)

  /** A sessão avisa quando falta este tempo para o fim. */
  const val AVISO_FIM_SESSAO_MS = 60_000L

  fun duracaoPausaIntencaoSeg(blocosUsados: Int): Int =
    SEQUENCIA_PAUSA_INTENCAO_SEG_V2[
      blocosUsados.coerceAtLeast(0).coerceAtMost(SEQUENCIA_PAUSA_INTENCAO_SEG_V2.size - 1)
    ]

  /** Sessões ainda disponíveis hoje; null = sem limite (blocosDiarios não configurado). */
  fun saldoDisponivel(s: EstadoSaldo, cfg: ConfigBloco): Int? {
    val limite = cfg.blocosDiarios ?: return null
    return maxOf(0, limite - s.blocosUsados + s.saldo)
  }

  fun permiteUso(s: EstadoSaldo): Boolean = s.fase == FaseBloqueio.SESSAO_ATIVA

  private fun entrarEmCooldown(s: EstadoSaldo, cfg: ConfigBloco, instante: Long) =
    s.copy(
      fase = FaseBloqueio.COOLDOWN,
      fimCooldownEm = instante + cfg.cooldownMin * MS_POR_MIN,
      consumidoMs = 0L,
      fgDesde = 0L,
    )

  /**
   * Aplica o que o passar do tempo já decidiu: virada do dia, sessão esgotada
   * em primeiro plano (vai direto ao cooldown), cooldown vencido (volta a
   * AGUARDANDO_LIBERACAO, ou SALDO_ZERADO se o limite diário acabou). Toda
   * transição chama isto antes de agir, então o estado é sempre derivável de
   * timestamps absolutos.
   */
  fun reconciliar(atual: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): EstadoSaldo {
    var s = if (atual.dia != dia) EstadoSaldo(dia = dia) else atual

    if (s.fase == FaseBloqueio.SESSAO_ATIVA) {
      val limite = cfg.duracaoBlocoMin * MS_POR_MIN
      val emCurso = if (s.fgDesde > 0L) maxOf(0L, agora - s.fgDesde) else 0L
      if (s.consumidoMs + emCurso >= limite) {
        val instanteFim = if (s.fgDesde > 0L) s.fgDesde + (limite - s.consumidoMs) else agora
        s = entrarEmCooldown(s, cfg, instanteFim)
      }
    }

    if (s.fase == FaseBloqueio.COOLDOWN && agora >= s.fimCooldownEm) {
      s =
        s.copy(
          fase =
            if (saldoDisponivel(s, cfg) == 0) FaseBloqueio.SALDO_ZERADO
            else FaseBloqueio.AGUARDANDO_LIBERACAO,
        )
    } else if (s.fase == FaseBloqueio.SALDO_ZERADO && saldoDisponivel(s, cfg) != 0) {
      // crédito de tarefa extra (ou limite aumentado): volta a oferecer sessão
      s = s.copy(fase = FaseBloqueio.AGUARDANDO_LIBERACAO)
    }
    return s
  }

  /** Credita cada extra nova (1x por id); a liberação não depende de tarefa. */
  fun aplicarSnapshot(
    estado: EstadoSaldo,
    extrasConcluidas: List<String>,
    cfg: ConfigBloco,
    agora: Long,
    dia: String,
  ): ResultadoTransicao {
    var s = reconciliar(estado, cfg, agora, dia)

    val novas = extrasConcluidas.filter { it !in s.extrasCreditadas }.distinct()
    if (novas.isNotEmpty()) {
      s =
        s.copy(
          extrasCreditadas = s.extrasCreditadas + novas,
          saldo = s.saldo + novas.size * cfg.blocoPorTarefaExtra,
        )
    }
    return ResultadoTransicao(reconciliar(s, cfg, agora, dia), true)
  }

  /** Fim da pausa de intenção: abre a sessão. Só vale em AGUARDANDO_LIBERACAO. */
  fun liberarBloco(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    if (s.fase != FaseBloqueio.AGUARDANDO_LIBERACAO) {
      return ResultadoTransicao(s, false)
    }
    return ResultadoTransicao(
      s.copy(
        fase = FaseBloqueio.SESSAO_ATIVA,
        blocosUsados = s.blocosUsados + 1,
        consumidoMs = 0L,
        fgDesde = 0L,
      ),
      true,
    )
  }

  fun entrouEmPrimeiroPlano(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    return ResultadoTransicao(
      if (permiteUso(s) && s.fgDesde == 0L) s.copy(fgDesde = agora) else s,
      true,
    )
  }

  fun saiuDePrimeiroPlano(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    return ResultadoTransicao(
      if (s.fgDesde > 0L) s.copy(consumidoMs = s.consumidoMs + (agora - s.fgDesde), fgDesde = 0L) else s,
      true,
    )
  }

  /** Ms de sessão ainda disponíveis (relógio parado ou não). */
  fun msRestantes(s: EstadoSaldo, cfg: ConfigBloco, agora: Long): Long {
    if (!permiteUso(s)) {
      return 0L
    }
    val emCurso = if (s.fgDesde > 0L) agora - s.fgDesde else 0L
    return maxOf(0L, cfg.duracaoBlocoMin * MS_POR_MIN - s.consumidoMs - emCurso)
  }

  /** Ms até a sessão esgotar contando só primeiro plano; null se o relógio está parado. */
  fun msAteEsgotar(s: EstadoSaldo, cfg: ConfigBloco, agora: Long): Long? {
    if (!permiteUso(s) || s.fgDesde == 0L) {
      return null
    }
    return msRestantes(s, cfg, agora)
  }

  /** Ms até o aviso de "1 minuto restante" (0 se já passou); null se o relógio está parado. */
  fun msAteAviso(s: EstadoSaldo, cfg: ConfigBloco, agora: Long): Long? {
    val faltam = msAteEsgotar(s, cfg, agora) ?: return null
    return maxOf(0L, faltam - AVISO_FIM_SESSAO_MS)
  }

  /** Aviso vale: sessão ativa, faltando 1 minuto ou menos e ainda não acabou. */
  fun avisoUmMinutoAtivo(s: EstadoSaldo, cfg: ConfigBloco, agora: Long): Boolean {
    val restante = msRestantes(s, cfg, agora)
    return permiteUso(s) && restante > 0L && restante <= AVISO_FIM_SESSAO_MS
  }

  // ---- compat temporário — removido na TASK-05 (usado por Prefs/Module) ----

  @Deprecated("compat temporário — removido na TASK-05")
  fun aplicarSnapshot(
    estado: EstadoSaldo,
    essencialCumprido: Boolean,
    extrasConcluidas: List<String>,
    cfg: ConfigBloco,
    agora: Long,
    dia: String,
  ): ResultadoTransicao = aplicarSnapshot(estado, extrasConcluidas, cfg, agora, dia)

  @Deprecated("compat temporário — removido na TASK-05")
  fun toleranciaDisponivel(s: EstadoSaldo, cfg: ConfigBloco): Boolean = false

  @Deprecated("compat temporário — removido na TASK-05")
  fun usarTolerancia(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao =
    ResultadoTransicao(reconciliar(estado, cfg, agora, dia), false)

  @Deprecated("compat temporário — removido na TASK-05")
  fun recusarTolerancia(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao =
    ResultadoTransicao(reconciliar(estado, cfg, agora, dia), false)
}
