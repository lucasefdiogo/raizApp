package com.luxthorapps.rootora

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AvisoSessaoTest {
  private val cfg = ConfigBloco()
  private val agora = 1_000_000_000L

  private fun ativaEmPrimeiroPlano() =
    EstadoSaldo(dia = "2026-01-01", fase = FaseBloqueio.SESSAO_ATIVA, blocosUsados = 1, fgDesde = agora)

  @Test
  fun `CA-03 sessão ativa em primeiro plano com mais de 1 minuto restante agenda o aviso para daqui a msAteAviso`() {
    val s = ativaEmPrimeiroPlano()
    val esperado = 14 * 60_000L
    assertEquals(esperado, SaldoBloqueioMaquina.msAteAviso(s, cfg, agora))
    assertEquals(esperado, SaldoBloqueioMaquina.msParaAgendarAviso(s, cfg, agora, false))
  }

  @Test
  fun `CA-03 o aviso não é agendado de novo na mesma sessão depois de exibido`() {
    assertNull(SaldoBloqueioMaquina.msParaAgendarAviso(ativaEmPrimeiroPlano(), cfg, agora, true))
  }

  @Test
  fun `CA-03 fora de primeiro plano ou sem sessão ativa não agenda aviso`() {
    val foraDePrimeiroPlano = ativaEmPrimeiroPlano().copy(fgDesde = 0L)
    assertNull(SaldoBloqueioMaquina.msParaAgendarAviso(foraDePrimeiroPlano, cfg, agora, false))
    val cooldown = ativaEmPrimeiroPlano().copy(fase = FaseBloqueio.COOLDOWN)
    assertNull(SaldoBloqueioMaquina.msParaAgendarAviso(cooldown, cfg, agora, false))
  }

  @Test
  fun `CA-03 chave do aviso muda a cada sessão e a cada dia`() {
    val a = SaldoBloqueioMaquina.chaveAvisoSessao(ativaEmPrimeiroPlano())
    val b = SaldoBloqueioMaquina.chaveAvisoSessao(ativaEmPrimeiroPlano().copy(blocosUsados = 2))
    val c = SaldoBloqueioMaquina.chaveAvisoSessao(ativaEmPrimeiroPlano().copy(dia = "2026-01-02"))
    assertEquals(false, a == b)
    assertEquals(false, a == c)
  }
}
