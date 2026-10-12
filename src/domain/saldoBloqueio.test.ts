import fixtures from './__fixtures__/saldoBloqueio.json';
import {
  CONFIG_BLOCO_PADRAO,
  ConfigBloco,
  EstadoSaldo,
  ResultadoTransicao,
  aplicarSnapshot,
  duracaoPausaIntencaoSeg,
  entrouEmPrimeiroPlano,
  essencialCumpridoNoDia,
  estadoInicialSaldo,
  extrairConfigBloco,
  extrasConcluidasDoDia,
  formatarContagemMs,
  liberarBloco,
  msAteEsgotar,
  msRestantes,
  permiteUso,
  reconciliar,
  recusarTolerancia,
  resolverConfigBloco,
  saiuDePrimeiroPlano,
  toleranciaDisponivel,
  usarTolerancia,
} from './saldoBloqueio';
import { Tarefa } from './types';

const MIN = 60_000;

interface Passo {
  evento: string;
  agoraMin: number;
  dia?: string;
  args?: { essencialCumprido: boolean; extrasConcluidas: string[] };
  esperado: Record<string, unknown>;
}

function executar(
  passo: Passo,
  estado: EstadoSaldo,
  cfg: ConfigBloco,
): ResultadoTransicao {
  const agora = fixtures.base + passo.agoraMin * MIN;
  const dia = passo.dia ?? fixtures.dia;
  switch (passo.evento) {
    case 'aplicarSnapshot':
      return aplicarSnapshot(estado, passo.args!, cfg, agora, dia);
    case 'liberarBloco':
      return liberarBloco(estado, cfg, agora, dia);
    case 'entrouEmPrimeiroPlano':
      return entrouEmPrimeiroPlano(estado, cfg, agora, dia);
    case 'saiuDePrimeiroPlano':
      return saiuDePrimeiroPlano(estado, cfg, agora, dia);
    case 'usarTolerancia':
      return usarTolerancia(estado, cfg, agora, dia);
    case 'recusarTolerancia':
      return recusarTolerancia(estado, cfg, agora, dia);
    case 'reconciliar':
      return { estado: reconciliar(estado, cfg, agora, dia), ok: true };
    default:
      throw new Error(`evento desconhecido: ${passo.evento}`);
  }
}

function valorObservado(
  chave: string,
  r: ResultadoTransicao,
): unknown {
  const e = r.estado;
  switch (chave) {
    case 'ok':
      return r.ok;
    case 'permiteUso':
      return permiteUso(e);
    case 'consumidoSeg':
      return e.consumidoMs / 1000;
    case 'fimCooldownEmMin':
      return (e.fimCooldownEm - fixtures.base) / MIN;
    default:
      return (e as unknown as Record<string, unknown>)[chave];
  }
}

describe('saldoBloqueio — fixtures compartilhadas com o Kotlin', () => {
  fixtures.casos.forEach(caso => {
    it(caso.nome, () => {
      const cfg = resolverConfigBloco(
        (caso as { config?: Partial<ConfigBloco> }).config,
      );
      let estado = estadoInicialSaldo(fixtures.dia);
      (caso.passos as Passo[]).forEach((passo, i) => {
        const resultado = executar(passo, estado, cfg);
        estado = resultado.estado;
        Object.entries(passo.esperado).forEach(([chave, esperado]) => {
          const obtido = valorObservado(chave, resultado);
          if (typeof esperado === 'number') {
            expect({ passo: i, chave, obtido }).toEqual({
              passo: i,
              chave,
              obtido: expect.closeTo(esperado, 6),
            });
          } else {
            expect({ passo: i, chave, obtido }).toEqual({
              passo: i,
              chave,
              obtido: esperado,
            });
          }
        });
      });
    });
  });
});

describe('duracaoPausaIntencaoSeg', () => {
  it('cresce 5, 10, 20, 40 e fica em 60 (teto)', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(duracaoPausaIntencaoSeg)).toEqual([
      5, 10, 20, 40, 60, 60, 60,
    ]);
  });

  it('valor negativo cai no primeiro degrau', () => {
    expect(duracaoPausaIntencaoSeg(-3)).toBe(5);
  });
});

describe('resolverConfigBloco / extrairConfigBloco', () => {
  it('sem regras ou sem os campos: padrão (15, 2, 30, 4, 1)', () => {
    expect(resolverConfigBloco(null)).toEqual(CONFIG_BLOCO_PADRAO);
    expect(resolverConfigBloco({})).toEqual({
      duracaoBlocoMin: 15,
      toleranciaMin: 2,
      cooldownMin: 30,
      blocosDiarios: 4,
      blocoPorTarefaExtra: 1,
    });
  });

  it('usa os campos válidos e ignora inválidos', () => {
    expect(
      resolverConfigBloco({
        duracaoBlocoMin: 10,
        cooldownMin: -1,
        blocosDiarios: NaN,
      }),
    ).toEqual({ ...CONFIG_BLOCO_PADRAO, duracaoBlocoMin: 10 });
  });

  it('extrairConfigBloco devolve só o que está presente', () => {
    expect(extrairConfigBloco({ cooldownMin: 10 })).toEqual({ cooldownMin: 10 });
    expect(extrairConfigBloco(undefined)).toEqual({});
  });
});

describe('helpers de tarefas', () => {
  const base = (sobrescrita: Partial<Tarefa>): Tarefa => ({
    id: 't',
    titulo: 'x',
    essencial: false,
    concluida: false,
    ...sobrescrita,
  });

  it('extras: só não essenciais, concluídas e que não são subtarefa', () => {
    const tarefas = [
      base({ id: 'a', concluida: true }),
      base({ id: 'b', concluida: false }),
      base({ id: 'c', essencial: true, concluida: true }),
      base({ id: 'd', concluida: true, tarefaPaiId: 'c' }),
    ];
    expect(extrasConcluidasDoDia(tarefas)).toEqual(['a']);
  });

  it('essencial cumprido: existe pelo menos uma e todas concluídas', () => {
    expect(essencialCumpridoNoDia([])).toBe(false);
    expect(
      essencialCumpridoNoDia([base({ essencial: true, concluida: false })]),
    ).toBe(false);
    expect(
      essencialCumpridoNoDia([
        base({ essencial: true, concluida: true }),
        base({ id: 'o', essencial: true, concluida: true }),
      ]),
    ).toBe(true);
  });
});

describe('derivados de exibição', () => {
  const cfg = CONFIG_BLOCO_PADRAO;
  const t0 = 1_700_000_000_000;

  function blocoRodando(): EstadoSaldo {
    return {
      ...estadoInicialSaldo('2026-10-11'),
      fase: 'BLOCO_ATIVO',
      consumidoMs: 5 * MIN,
      fgDesde: t0,
    };
  }

  it('msAteEsgotar: null com o relógio parado, restante com ele correndo', () => {
    expect(msAteEsgotar({ ...blocoRodando(), fgDesde: 0 }, cfg, t0)).toBeNull();
    expect(msAteEsgotar(blocoRodando(), cfg, t0 + 2 * MIN)).toBe(8 * MIN);
  });

  it('msRestantes considera o trecho em curso e vale 0 fora de bloco', () => {
    expect(msRestantes(blocoRodando(), cfg, t0 + MIN)).toBe(9 * MIN);
    expect(msRestantes(estadoInicialSaldo('2026-10-11'), cfg, t0)).toBe(0);
  });

  it('toleranciaDisponivel só na oferta pendente e ainda não usada', () => {
    const oferta: EstadoSaldo = {
      ...estadoInicialSaldo('2026-10-11'),
      fase: 'TOLERANCIA',
    };
    expect(toleranciaDisponivel(oferta, cfg)).toBe(true);
    expect(toleranciaDisponivel({ ...oferta, toleranciaUsada: true }, cfg)).toBe(false);
    expect(toleranciaDisponivel({ ...oferta, toleranciaAtiva: true }, cfg)).toBe(false);
  });

  it('formatarContagemMs arredonda pra cima', () => {
    expect(formatarContagemMs(30 * MIN)).toBe('30:00');
    expect(formatarContagemMs(1)).toBe('00:01');
    expect(formatarContagemMs(-5)).toBe('00:00');
  });
});
