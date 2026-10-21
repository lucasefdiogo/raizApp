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
  estadoInicialDia,
  extrairConfigBloco,
  extrasConcluidasDoDia,
  formatarContagemMs,
  avisoUmMinutoAtivo,
  liberarBloco,
  msAteAviso,
  msAteEsgotar,
  msRestantes,
  permiteUso,
  reconciliar,
  resolverConfigBloco,
  saiuDePrimeiroPlano,
} from './saldoBloqueio';
import { Tarefa } from './types';

const MIN = 60_000;

interface Passo {
  evento: string;
  agoraMin: number;
  dia?: string;
  args?: { extrasConcluidas: string[] };
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
    case 'reconciliar':
      return { estado: reconciliar(estado, cfg, agora, dia), ok: true };
    default:
      throw new Error(`evento desconhecido: ${passo.evento}`);
  }
}

function valorObservado(
  chave: string,
  r: ResultadoTransicao,
  cfg: ConfigBloco,
  agora: number,
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
    case 'restanteSeg':
      return msRestantes(e, cfg, agora) / 1000;
    case 'avisoUmMinuto':
      return avisoUmMinutoAtivo(e, cfg, agora);
    case 'msAteAvisoSeg': {
      const ms = msAteAviso(e, cfg, agora);
      return ms === null ? null : ms / 1000;
    }
    default:
      return (e as unknown as Record<string, unknown>)[chave];
  }
}

describe('saldoBloqueio — fixtures compartilhadas com o Kotlin', () => {
  fixtures.casos.forEach(caso => {
    it(caso.nome, () => {
      const cfg: ConfigBloco = {
        ...CONFIG_BLOCO_PADRAO,
        ...(caso as { config?: Partial<ConfigBloco> }).config,
      };
      let estado = estadoInicialDia(fixtures.dia);
      (caso.passos as Passo[]).forEach((passo, i) => {
        const resultado = executar(passo, estado, cfg);
        estado = resultado.estado;
        const agora = fixtures.base + passo.agoraMin * MIN;
        Object.entries(passo.esperado).forEach(([chave, esperado]) => {
          const obtido = valorObservado(chave, resultado, cfg, agora);
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

describe('motor de sessões', () => {
  const cfg: ConfigBloco = CONFIG_BLOCO_PADRAO;
  const dia = fixtures.dia;
  const t0 = fixtures.base;

  function sessaoEmPrimeiroPlano(): EstadoSaldo {
    const liberada = liberarBloco(estadoInicialDia(dia), cfg, t0, dia).estado;
    return entrouEmPrimeiroPlano(liberada, cfg, t0, dia).estado;
  }

  it('CA-02: apagar a tela por 2 minutos não avança o tempo da sessão', () => {
    const emUso = sessaoEmPrimeiroPlano();
    const apagou = saiuDePrimeiroPlano(emUso, cfg, t0 + 3 * MIN, dia).estado;
    expect(msRestantes(apagou, cfg, t0 + 3 * MIN)).toBe(12 * MIN);
    // tela apagada por 2 minutos: nada corre
    const voltou = entrouEmPrimeiroPlano(apagou, cfg, t0 + 5 * MIN, dia).estado;
    expect(voltou.fase).toBe('SESSAO_ATIVA');
    expect(msRestantes(voltou, cfg, t0 + 5 * MIN)).toBe(12 * MIN);
  });

  it('CA-03: faltando 1 minuto para o fim a sessão sinaliza o aviso', () => {
    const emUso = sessaoEmPrimeiroPlano();
    expect(avisoUmMinutoAtivo(emUso, cfg, t0 + 13 * MIN)).toBe(false);
    expect(msAteAviso(emUso, cfg, t0)).toBe(14 * MIN);
    expect(msAteAviso(emUso, cfg, t0 + 14 * MIN)).toBe(0);
    expect(avisoUmMinutoAtivo(emUso, cfg, t0 + 14 * MIN)).toBe(true);
    expect(avisoUmMinutoAtivo(emUso, cfg, t0 + 14.5 * MIN)).toBe(true);
    // fora da sessão não há aviso, nem depois que ela acabou
    expect(avisoUmMinutoAtivo(estadoInicialDia(dia), cfg, t0)).toBe(false);
    const fim = reconciliar(emUso, cfg, t0 + 15 * MIN, dia);
    expect(avisoUmMinutoAtivo(fim, cfg, t0 + 15 * MIN)).toBe(false);
  });

  it('CA-03: ao completar 15 minutos a sessão termina e o cooldown de 45 minutos começa', () => {
    const emUso = sessaoEmPrimeiroPlano();
    const antes = reconciliar(emUso, cfg, t0 + 15 * MIN - 1, dia);
    expect(antes.fase).toBe('SESSAO_ATIVA');
    const fim = reconciliar(emUso, cfg, t0 + 15 * MIN, dia);
    expect(fim.fase).toBe('COOLDOWN');
    expect(permiteUso(fim)).toBe(false);
    expect(fim.fimCooldownEm).toBe(t0 + 60 * MIN);
  });

  it('CA-03: o cooldown diminui com o tempo e sobrevive a reiniciar, por timestamp absoluto', () => {
    const emCooldown = reconciliar(sessaoEmPrimeiroPlano(), cfg, t0 + 15 * MIN, dia);
    // "reiniciar": o estado volta do disco só com o que foi persistido
    const reaberto: EstadoSaldo = JSON.parse(JSON.stringify(emCooldown));
    const meio = reconciliar(reaberto, cfg, t0 + 30 * MIN, dia);
    expect(meio.fase).toBe('COOLDOWN');
    expect(meio.fimCooldownEm - (t0 + 30 * MIN)).toBe(30 * MIN);
    const quase = reconciliar(reaberto, cfg, t0 + 60 * MIN - 1, dia);
    expect(quase.fase).toBe('COOLDOWN');
    expect(quase.fimCooldownEm).toBe(emCooldown.fimCooldownEm);
    const depois = reconciliar(reaberto, cfg, t0 + 60 * MIN, dia);
    expect(depois.fase).toBe('AGUARDANDO_LIBERACAO');
  });

  it('CA-02: liberar fora de AGUARDANDO_LIBERACAO não abre sessão', () => {
    const emUso = sessaoEmPrimeiroPlano();
    const emSessao = liberarBloco(emUso, cfg, t0 + MIN, dia);
    expect(emSessao.ok).toBe(false);
    expect(emSessao.estado.blocosUsados).toBe(1);
    const emCooldown = reconciliar(emUso, cfg, t0 + 15 * MIN, dia);
    const noCooldown = liberarBloco(emCooldown, cfg, t0 + 20 * MIN, dia);
    expect(noCooldown.ok).toBe(false);
    expect(noCooldown.estado.fase).toBe('COOLDOWN');
    expect(noCooldown.estado.blocosUsados).toBe(1);
  });

  it('CA-03: sem tolerância, o fim da sessão vai direto para o cooldown', () => {
    const emUso = sessaoEmPrimeiroPlano();
    const fim = reconciliar(emUso, cfg, t0 + 15 * MIN, dia);
    // nenhuma fase intermediária de oferta de tempo extra
    expect(fim.fase).toBe('COOLDOWN');
    expect(Object.keys(fim)).not.toContain('toleranciaAtiva');
  });
});

describe('duracaoPausaIntencaoSeg', () => {
  it('CA-01: a primeira sessão do dia tem pausa de intenção de 10 segundos', () => {
    expect(duracaoPausaIntencaoSeg(0)).toBe(10);
  });

  it('CA-04: a segunda sessão do dia tem pausa de intenção de 20 segundos', () => {
    expect(duracaoPausaIntencaoSeg(1)).toBe(20);
  });

  it('CA-05: a sexta sessão em diante fica no teto de 60 segundos', () => {
    expect([2, 3, 4].map(duracaoPausaIntencaoSeg)).toEqual([30, 40, 50]);
    expect([5, 6, 9].map(duracaoPausaIntencaoSeg)).toEqual([60, 60, 60]);
  });

  it('CA-01: valor negativo cai na primeira sessão', () => {
    expect(duracaoPausaIntencaoSeg(-3)).toBe(10);
  });
});

describe('resolverConfigBloco / extrairConfigBloco', () => {
  it('CA-05: sem blocosDiarios configurado o padrão resolvido é sem limite', () => {
    const padrao = {
      duracaoBlocoMin: 15,
      toleranciaMin: 0,
      cooldownMin: 45,
      blocosDiarios: null,
      blocoPorTarefaExtra: 1,
    };
    expect(CONFIG_BLOCO_PADRAO).toEqual(padrao);
    expect(resolverConfigBloco(null)).toEqual(padrao);
    expect(resolverConfigBloco({})).toEqual(padrao);
  });

  it('CA-06: blocosDiarios inválido ou negativo cai em sem limite, não em zero', () => {
    [NaN, -1, Infinity, 2.5].forEach(invalido => {
      expect(
        resolverConfigBloco({ blocosDiarios: invalido }).blocosDiarios,
      ).toBeNull();
    });
    expect(resolverConfigBloco({ blocosDiarios: 2 }).blocosDiarios).toBe(2);
  });

  it('CA-01: regras antigas com duracaoBlocoMin 15 e cooldownMin 30 salvos passam a valer 15 e 45', () => {
    const r = resolverConfigBloco({
      duracaoBlocoMin: 15,
      cooldownMin: 30,
      toleranciaMin: 2,
      blocosDiarios: 4,
    });
    expect(r.duracaoBlocoMin).toBe(15);
    expect(r.cooldownMin).toBe(45);
    expect(r.toleranciaMin).toBe(0);
    expect(r.blocosDiarios).toBeNull();
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
  const cfg: ConfigBloco = CONFIG_BLOCO_PADRAO;
  const t0 = 1_700_000_000_000;

  function sessaoRodando(): EstadoSaldo {
    return {
      ...estadoInicialDia('2026-10-11'),
      fase: 'SESSAO_ATIVA',
      consumidoMs: 5 * MIN,
      fgDesde: t0,
    };
  }

  it('msAteEsgotar: null com o relógio parado, restante com ele correndo', () => {
    expect(msAteEsgotar({ ...sessaoRodando(), fgDesde: 0 }, cfg, t0)).toBeNull();
    expect(msAteEsgotar(sessaoRodando(), cfg, t0 + 2 * MIN)).toBe(8 * MIN);
  });

  it('msRestantes considera o trecho em curso e vale 0 fora de sessão', () => {
    expect(msRestantes(sessaoRodando(), cfg, t0 + MIN)).toBe(9 * MIN);
    expect(msRestantes(estadoInicialDia('2026-10-11'), cfg, t0)).toBe(0);
  });

  it('formatarContagemMs arredonda pra cima', () => {
    expect(formatarContagemMs(30 * MIN)).toBe('30:00');
    expect(formatarContagemMs(1)).toBe('00:01');
    expect(formatarContagemMs(-5)).toBe('00:00');
  });
});
