package com.luxthorapps.rootora

/**
 * Máquina de estados do saldo diário de blocos de uso dos apps bloqueados.
 * PURA de propósito (sem Context, sem JSON, sem relógio — `agora` e `dia`
 * entram por parâmetro): é o que o JUnit exercita. Porte 1:1 de
 * src/domain/saldoBloqueio.ts; as duas cópias são validadas pelas MESMAS
 * fixtures (src/domain/__fixtures__/saldoBloqueio.json). Mexeu aqui, mexa lá
 * e nas fixtures. Vive em Kotlin porque o AccessibilityService roda sem JS.
 *
 * PAUSA_INTENCAO não existe aqui: é só estado de tela (reinicia se o usuário
 * sai), não há o que persistir.
 */
enum class FaseBloqueio {
  BLOQUEADO_SEM_ESSENCIAL,
  AGUARDANDO_LIBERACAO,
  BLOCO_ATIVO,
  TOLERANCIA,
  COOLDOWN,
  SALDO_ZERADO,
}

data class ConfigBloco(
  val duracaoBlocoMin: Int = 15,
  val toleranciaMin: Int = 2,
  val cooldownMin: Int = 30,
  val blocosDiarios: Int = 4,
  val blocoPorTarefaExtra: Int = 1,
)

data class EstadoSaldo(
  val dia: String,
  val fase: FaseBloqueio = FaseBloqueio.BLOQUEADO_SEM_ESSENCIAL,
  val saldo: Int = 0,
  val blocosUsados: Int = 0,
  val toleranciasUsadas: Int = 0,
  val essencialCreditado: Boolean = false,
  val extrasCreditadas: List<String> = emptyList(),
  val consumidoMs: Long = 0L,
  val toleranciaUsada: Boolean = false,
  val toleranciaAtiva: Boolean = false,
  val fimCooldownEm: Long = 0L,
  val fgDesde: Long = 0L,
)

data class ResultadoTransicao(val estado: EstadoSaldo, val ok: Boolean)

object SaldoBloqueioMaquina {
  private const val MS_POR_MIN = 60_000L

  fun permiteUso(s: EstadoSaldo): Boolean =
    s.fase == FaseBloqueio.BLOCO_ATIVO ||
      (s.fase == FaseBloqueio.TOLERANCIA && s.toleranciaAtiva)

  private fun entrarEmCooldown(s: EstadoSaldo, cfg: ConfigBloco, instante: Long) =
    s.copy(
      fase = FaseBloqueio.COOLDOWN,
      fimCooldownEm = instante + cfg.cooldownMin * MS_POR_MIN,
      consumidoMs = 0L,
      toleranciaAtiva = false,
      fgDesde = 0L,
    )

  /**
   * Aplica o que o passar do tempo já decidiu (virada do dia, bloco/tolerância
   * esgotado em primeiro plano, cooldown vencido). Toda transição chama isto
   * antes de agir, então o estado é sempre derivável de timestamps absolutos.
   */
  fun reconciliar(atual: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): EstadoSaldo {
    var s = if (atual.dia != dia) EstadoSaldo(dia = dia) else atual

    val emBloco = s.fase == FaseBloqueio.BLOCO_ATIVO
    if (emBloco || (s.fase == FaseBloqueio.TOLERANCIA && s.toleranciaAtiva)) {
      val limite = (if (emBloco) cfg.duracaoBlocoMin else cfg.toleranciaMin) * MS_POR_MIN
      val emCurso = if (s.fgDesde > 0L) maxOf(0L, agora - s.fgDesde) else 0L
      if (s.consumidoMs + emCurso >= limite) {
        val instanteFim = if (s.fgDesde > 0L) s.fgDesde + (limite - s.consumidoMs) else agora
        s =
          if (emBloco && cfg.toleranciaMin > 0) {
            s.copy(
              fase = FaseBloqueio.TOLERANCIA,
              toleranciaAtiva = false,
              consumidoMs = 0L,
              fgDesde = 0L,
            )
          } else {
            entrarEmCooldown(s, cfg, instanteFim)
          }
      }
    }

    if (s.fase == FaseBloqueio.COOLDOWN && agora >= s.fimCooldownEm) {
      s = s.copy(
        fase = if (s.saldo > 0) FaseBloqueio.AGUARDANDO_LIBERACAO else FaseBloqueio.SALDO_ZERADO,
      )
    }
    if (s.fase == FaseBloqueio.SALDO_ZERADO && s.saldo > 0) {
      s = s.copy(fase = FaseBloqueio.AGUARDANDO_LIBERACAO)
    }
    return s
  }

  /** Credita o essencial (1x/dia) e cada extra nova (1x por id). Extras antes do essencial já entram no saldo. */
  fun aplicarSnapshot(
    estado: EstadoSaldo,
    essencialCumprido: Boolean,
    extrasConcluidas: List<String>,
    cfg: ConfigBloco,
    agora: Long,
    dia: String,
  ): ResultadoTransicao {
    var s = reconciliar(estado, cfg, agora, dia)

    val novas = extrasConcluidas.filter { it !in s.extrasCreditadas }.distinct()
    if (novas.isNotEmpty()) {
      s = s.copy(
        extrasCreditadas = s.extrasCreditadas + novas,
        saldo = s.saldo + novas.size * cfg.blocoPorTarefaExtra,
      )
    }

    if (essencialCumprido && !s.essencialCreditado) {
      s = s.copy(
        essencialCreditado = true,
        saldo = s.saldo + cfg.blocosDiarios,
        fase =
          if (s.fase == FaseBloqueio.BLOQUEADO_SEM_ESSENCIAL) FaseBloqueio.AGUARDANDO_LIBERACAO
          else s.fase,
      )
    }

    return ResultadoTransicao(reconciliar(s, cfg, agora, dia), true)
  }

  fun liberarBloco(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    if (s.fase != FaseBloqueio.AGUARDANDO_LIBERACAO || s.saldo <= 0) {
      return ResultadoTransicao(s, false)
    }
    return ResultadoTransicao(
      s.copy(
        fase = FaseBloqueio.BLOCO_ATIVO,
        saldo = s.saldo - 1,
        blocosUsados = s.blocosUsados + 1,
        consumidoMs = 0L,
        toleranciaUsada = false,
        toleranciaAtiva = false,
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

  fun toleranciaDisponivel(s: EstadoSaldo, cfg: ConfigBloco): Boolean =
    s.fase == FaseBloqueio.TOLERANCIA && !s.toleranciaAtiva && !s.toleranciaUsada && cfg.toleranciaMin > 0

  fun usarTolerancia(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    if (!toleranciaDisponivel(s, cfg)) {
      return ResultadoTransicao(s, false)
    }
    return ResultadoTransicao(
      s.copy(
        toleranciaAtiva = true,
        toleranciaUsada = true,
        toleranciasUsadas = s.toleranciasUsadas + 1,
        consumidoMs = 0L,
        fgDesde = 0L,
      ),
      true,
    )
  }

  fun recusarTolerancia(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    if (s.fase != FaseBloqueio.TOLERANCIA || s.toleranciaAtiva) {
      return ResultadoTransicao(s, false)
    }
    return ResultadoTransicao(reconciliar(entrarEmCooldown(s, cfg, agora), cfg, agora, dia), true)
  }

  /** Ms até o bloco/tolerância esgotar contando só primeiro plano; null se o relógio está parado. Agenda o aviso do Service. */
  fun msAteEsgotar(s: EstadoSaldo, cfg: ConfigBloco, agora: Long): Long? {
    if (!permiteUso(s) || s.fgDesde == 0L) {
      return null
    }
    val limite = (if (s.fase == FaseBloqueio.BLOCO_ATIVO) cfg.duracaoBlocoMin else cfg.toleranciaMin) * MS_POR_MIN
    return maxOf(0L, limite - s.consumidoMs - (agora - s.fgDesde))
  }
}
