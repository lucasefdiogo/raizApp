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
}

/**
 * Liberação de 2 min fora da sessão normal (HU-05): ACESSO_RAPIDO conta na
 * cota do dia, EMERGENCIA não. Tem relógio próprio e nunca mexe em
 * consumidoMs, fgDesde nem fimCooldownEm da sessão.
 */
enum class LiberacaoRapida {
  NENHUMA,
  ACESSO_RAPIDO,
  EMERGENCIA,
}

data class ConfigBloco(
  val duracaoBlocoMin: Int = 15,
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
  val extrasCreditadas: List<String> = emptyList(),
  /** Tempo em primeiro plano já gasto na sessão, sem contar o trecho aberto de `fgDesde`. */
  val consumidoMs: Long = 0L,
  /** Epoch ms de quando o cooldown acaba (timestamp absoluto). */
  val fimCooldownEm: Long = 0L,
  /** Epoch ms de quando o app bloqueado entrou em primeiro plano; 0 = fora de primeiro plano. */
  val fgDesde: Long = 0L,
  /** Usos do acesso rápido hoje. Estado salvo antes da HU-05 não tem o campo: 0 = cota cheia. */
  val acessoRapidoUsos: Int = 0,
  /** Epoch ms do fim do último acesso rápido (o intervalo conta daqui); 0 = nenhum. */
  val acessoRapidoFimUltimoEm: Long = 0L,
  val liberacaoRapida: LiberacaoRapida = LiberacaoRapida.NENHUMA,
  /** Primeiro plano já gasto na liberação rápida, sem o trecho aberto de `liberacaoRapidaFgDesde`. */
  val liberacaoRapidaConsumidoMs: Long = 0L,
  /** Epoch ms de quando o app bloqueado entrou em primeiro plano na liberação rápida; 0 = fora. */
  val liberacaoRapidaFgDesde: Long = 0L,
)

data class ResultadoTransicao(val estado: EstadoSaldo, val ok: Boolean)

object SaldoBloqueioMaquina {
  private const val MS_POR_MIN = 60_000L

  /** Duração da pausa de intenção por bloco já liberado no dia; o último valor é o teto. */
  val SEQUENCIA_PAUSA_INTENCAO_SEG_V2: List<Int> = listOf(10, 20, 30, 40, 50, 60)

  /** Acessos rápidos por dia. */
  const val ACESSOS_RAPIDOS_DIARIOS = 3

  /** Intervalo mínimo, em minutos, depois do 1º, 2º e 3º uso do dia. */
  val INTERVALOS_ACESSO_RAPIDO_MIN: List<Int> = listOf(15, 30, 60)

  /** Duração do acesso rápido e da emergência, só em primeiro plano. */
  const val DURACAO_LIBERACAO_RAPIDA_MIN = 2

  /** A sessão avisa quando falta este tempo para o fim. */
  const val AVISO_FIM_SESSAO_MS = 60_000L

  /**
   * Lê o nome de fase gravado em SharedPreferences. Estados salvos antes da
   * máquina de sessões trazem fases que não existem mais: BLOCO_ATIVO vira
   * SESSAO_ATIVA (o consumo e o trecho em aberto seguem valendo),
   * TOLERANCIA vira COOLDOWN (o bloco já tinha acabado; vale o
   * fimCooldownEm salvo, e 0 reconcilia direto para liberado) e
   * BLOQUEADO_SEM_ESSENCIAL vira AGUARDANDO_LIBERACAO (nenhuma tarefa
   * bloqueia mais). Nome ausente ou desconhecido também cai em
   * AGUARDANDO_LIBERACAO.
   */
  fun faseDeNomeSalvo(nome: String?): FaseBloqueio =
    when (nome) {
      "BLOCO_ATIVO" -> FaseBloqueio.SESSAO_ATIVA
      "TOLERANCIA" -> FaseBloqueio.COOLDOWN
      else -> FaseBloqueio.values().firstOrNull { it.name == nome } ?: FaseBloqueio.AGUARDANDO_LIBERACAO
    }

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

  /** O app bloqueado abre sem interceptação: sessão ativa ou liberação rápida (acesso rápido/emergência) valendo. */
  fun appPodeAbrir(s: EstadoSaldo): Boolean = permiteUso(s) || acessoRapidoLiberado(s)

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

    if (s.liberacaoRapida != LiberacaoRapida.NENHUMA) {
      val limite = DURACAO_LIBERACAO_RAPIDA_MIN * MS_POR_MIN
      val emCurso = if (s.liberacaoRapidaFgDesde > 0L) maxOf(0L, agora - s.liberacaoRapidaFgDesde) else 0L
      if (s.liberacaoRapidaConsumidoMs + emCurso >= limite) {
        val instanteFim =
          if (s.liberacaoRapidaFgDesde > 0L) s.liberacaoRapidaFgDesde + (limite - s.liberacaoRapidaConsumidoMs) else agora
        s =
          s.copy(
            // o intervalo entre acessos conta do fim; a emergência não mexe na cota
            acessoRapidoFimUltimoEm =
              if (s.liberacaoRapida == LiberacaoRapida.ACESSO_RAPIDO) instanteFim else s.acessoRapidoFimUltimoEm,
            liberacaoRapida = LiberacaoRapida.NENHUMA,
            liberacaoRapidaConsumidoMs = 0L,
            liberacaoRapidaFgDesde = 0L,
          )
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

  fun liberacaoRapidaAtiva(s: EstadoSaldo): Boolean = s.liberacaoRapida != LiberacaoRapida.NENHUMA

  /** Há uma liberação de 2 min (acesso rápido ou emergência) valendo agora; o app abre com permiteUso(s) || isto. */
  fun acessoRapidoLiberado(s: EstadoSaldo): Boolean = liberacaoRapidaAtiva(s)

  /**
   * Ms até o próximo acesso rápido liberar, contados do fim do anterior.
   * 0 = disponível agora; null = cota do dia esgotada.
   */
  fun msAteProximoAcessoRapido(s: EstadoSaldo, agora: Long): Long? {
    if (s.acessoRapidoUsos >= ACESSOS_RAPIDOS_DIARIOS) return null
    if (s.acessoRapidoUsos <= 0) return 0L
    val intervaloMin = INTERVALOS_ACESSO_RAPIDO_MIN[s.acessoRapidoUsos - 1]
    return maxOf(0L, s.acessoRapidoFimUltimoEm + intervaloMin * MS_POR_MIN - agora)
  }

  fun acessoRapidoDisponivel(s: EstadoSaldo, agora: Long): Boolean = msAteProximoAcessoRapido(s, agora) == 0L

  private fun abrirLiberacaoRapida(s: EstadoSaldo, tipo: LiberacaoRapida): EstadoSaldo =
    s.copy(
      liberacaoRapida = tipo,
      liberacaoRapidaConsumidoMs = 0L,
      liberacaoRapidaFgDesde = 0L,
      acessoRapidoUsos =
        if (tipo == LiberacaoRapida.ACESSO_RAPIDO) s.acessoRapidoUsos + 1 else s.acessoRapidoUsos,
    )

  /**
   * Fim da espera de 5 s do acesso rápido: abre 2 min de uso. Vale com cota e
   * intervalo livres, sem sessão ativa e sem outra liberação rápida em curso.
   * Pode ser usado em cooldown, que segue intacto.
   */
  fun liberarAcessoRapido(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    if (s.fase == FaseBloqueio.SESSAO_ATIVA || liberacaoRapidaAtiva(s) || !acessoRapidoDisponivel(s, agora)) {
      return ResultadoTransicao(s, false)
    }
    return ResultadoTransicao(abrirLiberacaoRapida(s, LiberacaoRapida.ACESSO_RAPIDO), true)
  }

  /**
   * Fim da respiração de 60 s da emergência: abre 2 min de uso sem consumir a
   * cota do acesso rápido e sem limite diário. Só vale sem sessão ativa e sem
   * outra liberação rápida em curso.
   */
  fun concluirEmergencia(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    val s = reconciliar(estado, cfg, agora, dia)
    if (s.fase == FaseBloqueio.SESSAO_ATIVA || liberacaoRapidaAtiva(s)) {
      return ResultadoTransicao(s, false)
    }
    return ResultadoTransicao(abrirLiberacaoRapida(s, LiberacaoRapida.EMERGENCIA), true)
  }

  /** A saída de emergência aparece: sem sessão disponível, sem liberação em curso e sem acesso rápido possível. */
  fun emergenciaOferecidaNoEstado(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String = estado.dia): Boolean {
    val s = reconciliar(estado, cfg, agora, dia)
    if (liberacaoRapidaAtiva(s)) return false
    val sessaoDisponivel = s.fase == FaseBloqueio.SESSAO_ATIVA || s.fase == FaseBloqueio.AGUARDANDO_LIBERACAO
    return !sessaoDisponivel && !acessoRapidoDisponivel(s, agora)
  }

  /** Ms da liberação rápida ainda disponíveis (relógio parado ou não). */
  fun msRestantesLiberacaoRapida(s: EstadoSaldo, agora: Long): Long {
    if (!liberacaoRapidaAtiva(s)) return 0L
    val emCurso = if (s.liberacaoRapidaFgDesde > 0L) agora - s.liberacaoRapidaFgDesde else 0L
    return maxOf(0L, DURACAO_LIBERACAO_RAPIDA_MIN * MS_POR_MIN - s.liberacaoRapidaConsumidoMs - emCurso)
  }

  /** Ms até a liberação rápida esgotar contando só primeiro plano; null se o relógio está parado. */
  fun msAteEsgotarLiberacaoRapida(s: EstadoSaldo, agora: Long): Long? {
    if (!liberacaoRapidaAtiva(s) || s.liberacaoRapidaFgDesde == 0L) return null
    return msRestantesLiberacaoRapida(s, agora)
  }

  fun entrouEmPrimeiroPlano(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    var s = reconciliar(estado, cfg, agora, dia)
    if (permiteUso(s) && s.fgDesde == 0L) s = s.copy(fgDesde = agora)
    if (liberacaoRapidaAtiva(s) && s.liberacaoRapidaFgDesde == 0L) s = s.copy(liberacaoRapidaFgDesde = agora)
    return ResultadoTransicao(s, true)
  }

  fun saiuDePrimeiroPlano(estado: EstadoSaldo, cfg: ConfigBloco, agora: Long, dia: String): ResultadoTransicao {
    var s = reconciliar(estado, cfg, agora, dia)
    if (s.fgDesde > 0L) s = s.copy(consumidoMs = s.consumidoMs + (agora - s.fgDesde), fgDesde = 0L)
    if (s.liberacaoRapidaFgDesde > 0L) {
      s =
        s.copy(
          liberacaoRapidaConsumidoMs = s.liberacaoRapidaConsumidoMs + (agora - s.liberacaoRapidaFgDesde),
          liberacaoRapidaFgDesde = 0L,
        )
    }
    return ResultadoTransicao(s, true)
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

  /** Quando agendar o toast de aviso (ms a partir de agora); null = não agendar (parado, sem sessão ativa ou já exibido). */
  fun msParaAgendarAviso(s: EstadoSaldo, cfg: ConfigBloco, agora: Long, avisoJaExibido: Boolean): Long? =
    if (avisoJaExibido) null else msAteAviso(s, cfg, agora)

  /** Identifica a sessão (dia + contador de sessões usadas) para lembrar que o aviso dela já saiu. */
  fun chaveAvisoSessao(s: EstadoSaldo): String = "${s.dia}#${s.blocosUsados}"
}
