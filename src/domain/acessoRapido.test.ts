import {
  ACESSOS_RAPIDOS_DIARIOS,
  INTERVALOS_ACESSO_RAPIDO_MIN,
  acessoRapidoDisponivel,
  emergenciaOferecida,
  msAteProximoAcessoRapido,
} from './acessoRapido';
import { EstadoAcessoRapido } from './types';

const MIN = 60_000;
const T0 = 1_000_000_000_000;

const estado = (usosHoje: number, fimUltimoEm: number): EstadoAcessoRapido => ({
  usosHoje,
  fimUltimoEm,
});

describe('acessoRapido', () => {
  it('CA-03: depois do 1º acesso rápido o próximo libera em 15 min, depois do 2º em 30 min', () => {
    expect(ACESSOS_RAPIDOS_DIARIOS).toBe(3);
    expect(INTERVALOS_ACESSO_RAPIDO_MIN).toEqual([15, 30, 60]);

    // cota cheia: disponível agora
    expect(acessoRapidoDisponivel(estado(0, 0), T0)).toBe(true);
    expect(msAteProximoAcessoRapido(estado(0, 0), T0)).toBe(0);

    // 1º uso terminou em T0
    const um = estado(1, T0);
    expect(msAteProximoAcessoRapido(um, T0)).toBe(15 * MIN);
    expect(acessoRapidoDisponivel(um, T0 + 14 * MIN)).toBe(false);
    expect(acessoRapidoDisponivel(um, T0 + 15 * MIN)).toBe(true);

    // 2º uso terminou em T0
    const dois = estado(2, T0);
    expect(msAteProximoAcessoRapido(dois, T0 + 10 * MIN)).toBe(20 * MIN);
    expect(acessoRapidoDisponivel(dois, T0 + 29 * MIN)).toBe(false);
    expect(acessoRapidoDisponivel(dois, T0 + 30 * MIN)).toBe(true);
  });

  it('CA-03: depois do 3º acesso rápido do dia a cota esgota e o botão não volta', () => {
    const tres = estado(3, T0);
    expect(acessoRapidoDisponivel(tres, T0)).toBe(false);
    expect(acessoRapidoDisponivel(tres, T0 + 60 * MIN)).toBe(false);
    expect(acessoRapidoDisponivel(tres, T0 + 24 * 60 * MIN)).toBe(false);
    expect(msAteProximoAcessoRapido(tres, T0 + 60 * MIN)).toBeNull();
  });

  it('CA-06: com acesso rápido disponível a emergência não é oferecida', () => {
    const base = { sessaoAtiva: false, cooldownLiberavel: false };
    // disponível: não oferece
    expect(
      emergenciaOferecida({ ...base, acessoRapido: estado(0, 0), agora: T0 }),
    ).toBe(false);
    expect(
      emergenciaOferecida({
        ...base,
        acessoRapido: estado(1, T0),
        agora: T0 + 15 * MIN,
      }),
    ).toBe(false);
    // indisponível por intervalo ou cota, sem sessão: oferece
    expect(
      emergenciaOferecida({ ...base, acessoRapido: estado(1, T0), agora: T0 }),
    ).toBe(true);
    expect(
      emergenciaOferecida({ ...base, acessoRapido: estado(3, T0), agora: T0 }),
    ).toBe(true);
    // sessão ativa ou cooldown liberável: nunca oferece
    expect(
      emergenciaOferecida({
        ...base,
        sessaoAtiva: true,
        acessoRapido: estado(3, T0),
        agora: T0,
      }),
    ).toBe(false);
    expect(
      emergenciaOferecida({
        ...base,
        cooldownLiberavel: true,
        acessoRapido: estado(3, T0),
        agora: T0,
      }),
    ).toBe(false);
  });

  it('CA-03: o intervalo conta a partir do fim do acesso anterior, não do início', () => {
    // acesso começou em T0 e durou 2 min: terminou em T0 + 2 min
    const fim = T0 + 2 * MIN;
    const um = estado(1, fim);
    expect(acessoRapidoDisponivel(um, T0 + 15 * MIN)).toBe(false); // 15 min do início
    expect(msAteProximoAcessoRapido(um, T0 + 15 * MIN)).toBe(2 * MIN);
    expect(acessoRapidoDisponivel(um, fim + 15 * MIN)).toBe(true);
  });
});
