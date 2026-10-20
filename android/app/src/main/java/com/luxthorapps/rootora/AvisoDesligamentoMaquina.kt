package com.luxthorapps.rootora

data class LembreteAgendavel(val ordem: Int, val em: Long)

data class TextoLembrete(val titulo: String, val corpo: String)

data class CondicoesExibicao(
  val servicoDesligado: Boolean,
  val temRegrasBloqueio: Boolean,
  val jaAtivadoAlgumaVez: Boolean,
  val notificacoesAtivas: Boolean,
)

/**
 * Kotlin mirror of domain/avisoBloqueio.ts (the alarm and receiver run without
 * JS). Both copies are validated by the SAME fixture
 * (domain/__fixtures__/avisoBloqueio.json): change here, change there.
 * Times use the device LOCAL calendar (RN-02: 09:00 device time).
 */
object AvisoDesligamentoMaquina {
  private const val HORA_LEMBRETE = 9
  private const val DIAS_ENTRE_LEMBRETES = 3

  private val TEXTOS =
    mapOf(
      1 to TextoLembrete("Bloqueio de apps desligado", "Desligado desde ontem. Toque para religar quando quiser."),
      2 to TextoLembrete("Bloqueio de apps desligado", "Desligado há alguns dias. Toque para religar quando quiser."),
    )

  /** Local 09:00 of the day `diasDepois` after the local day of `instante`. */
  private fun noveHorasDepois(instante: Long, diasDepois: Int): Long {
    val c = java.util.Calendar.getInstance()
    c.timeInMillis = instante
    val ano = c.get(java.util.Calendar.YEAR)
    val mes = c.get(java.util.Calendar.MONTH)
    val dia = c.get(java.util.Calendar.DAY_OF_MONTH)
    c.clear()
    // Calendar normalizes day overflow (e.g. day 33) on the local calendar.
    c.set(ano, mes, dia + diasDepois, HORA_LEMBRETE, 0, 0)
    return c.timeInMillis
  }

  /** RN-02: 1st at 09:00 the day after the shutdown; 2nd three days after the 1st; nothing else. */
  fun horariosLembretes(desligadoEm: Long): Pair<Long, Long> =
    Pair(
      noveHorasDepois(desligadoEm, 1),
      noveHorasDepois(desligadoEm, 1 + DIAS_ENTRE_LEMBRETES),
    )

  /** None if re-enabled after the shutdown; otherwise only those strictly after `agora`. */
  fun lembretesAgendaveis(desligadoEm: Long, religadoEm: Long?, agora: Long): List<LembreteAgendavel> {
    if (religadoEm != null && religadoEm >= desligadoEm) return emptyList()
    val (primeiro, segundo) = horariosLembretes(desligadoEm)
    return listOf(LembreteAgendavel(1, primeiro), LembreteAgendavel(2, segundo)).filter { it.em > agora }
  }

  /** RN-04. */
  fun textoLembrete(ordem: Int): TextoLembrete =
    TEXTOS[ordem] ?: throw IllegalArgumentException("unknown reminder order: $ordem")

  /** RN-03: if any condition fails the reminder is silently dropped. */
  fun deveExibirLembrete(c: CondicoesExibicao): Boolean =
    c.servicoDesligado && c.temRegrasBloqueio && c.jaAtivadoAlgumaVez && c.notificacoesAtivas

  /** RN-06: service is off and the last recorded event is not already a shutdown. */
  fun deveRegistrarDesligamentoNaAbertura(servicoDesligado: Boolean, ultimoEvento: String?): Boolean =
    servicoDesligado && ultimoEvento != "desligamento"
}
