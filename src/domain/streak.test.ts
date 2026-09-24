import {
  aplicarResultadoDia,
  avaliarDiaCumprido,
  calcularProgressoProximoMarco,
  calcularStatusDia,
  deveRenovarEscudo,
  existeEssencialConcluida,
  inicializarPrimeiroDia,
  renovarEscudo,
  verificarMarco,
} from './streak';
import { EstadoStreak, Tarefa } from './types';

function criarTarefa(sobrescritas: Partial<Tarefa>): Tarefa {
  return {
    id: '1',
    titulo: 'tarefa',
    essencial: false,
    concluida: false,
    ...sobrescritas,
  };
}

describe('avaliarDiaCumprido', () => {
  it('retorna false quando não há tarefas', () => {
    expect(avaliarDiaCumprido([])).toBe(false);
  });

  it('retorna true quando ao menos uma tarefa essencial está concluída', () => {
    const tarefas = [
      criarTarefa({ id: '1', essencial: true, concluida: true }),
      criarTarefa({ id: '2', essencial: false, concluida: false }),
      criarTarefa({ id: '3', essencial: false, concluida: false }),
    ];
    expect(avaliarDiaCumprido(tarefas)).toBe(true);
  });

  it('retorna true quando 60% ou mais das tarefas estão concluídas, mesmo sem essencial', () => {
    const tarefas = [
      criarTarefa({ id: '1', concluida: true }),
      criarTarefa({ id: '2', concluida: true }),
      criarTarefa({ id: '3', concluida: true }),
      criarTarefa({ id: '4', concluida: false }),
      criarTarefa({ id: '5', concluida: false }),
    ];
    expect(avaliarDiaCumprido(tarefas)).toBe(true);
  });

  it('retorna false quando menos de 60% das tarefas estão concluídas e nenhuma essencial', () => {
    const tarefas = [
      criarTarefa({ id: '1', concluida: true }),
      criarTarefa({ id: '2', concluida: false }),
      criarTarefa({ id: '3', concluida: false }),
    ];
    expect(avaliarDiaCumprido(tarefas)).toBe(false);
  });
});

describe('existeEssencialConcluida', () => {
  it('retorna true quando alguma tarefa essencial está concluída', () => {
    const tarefas = [
      criarTarefa({ id: '1', essencial: true, concluida: true }),
      criarTarefa({ id: '2', essencial: false, concluida: false }),
    ];
    expect(existeEssencialConcluida(tarefas)).toBe(true);
  });

  it('retorna false quando nenhuma essencial está concluída, mesmo com outras tarefas concluídas', () => {
    const tarefas = [
      criarTarefa({ id: '1', essencial: true, concluida: false }),
      criarTarefa({ id: '2', essencial: false, concluida: true }),
    ];
    expect(existeEssencialConcluida(tarefas)).toBe(false);
  });

  it('retorna false para lista vazia', () => {
    expect(existeEssencialConcluida([])).toBe(false);
  });
});

describe('calcularStatusDia', () => {
  it('retorna pendente quando nenhuma tarefa foi concluída ainda', () => {
    const tarefas = [criarTarefa({ concluida: false })];
    expect(calcularStatusDia(tarefas)).toBe('pendente');
  });

  it('retorna cumprido quando a regra de dia cumprido é atendida', () => {
    const tarefas = [criarTarefa({ essencial: true, concluida: true })];
    expect(calcularStatusDia(tarefas)).toBe('cumprido');
  });

  it('retorna nao_cumprido quando há progresso mas a regra não foi atendida', () => {
    const tarefas = [
      criarTarefa({ id: '1', concluida: true }),
      criarTarefa({ id: '2', concluida: false }),
      criarTarefa({ id: '3', concluida: false }),
    ];
    expect(calcularStatusDia(tarefas)).toBe('nao_cumprido');
  });
});

const estadoBase: EstadoStreak = {
  streakAtual: 4,
  diasTotaisAtivos: 10,
  escudosDisponiveis: 1,
  marcosAtingidos: [],
  ultimoDiaAtivo: '2026-09-08',
  statusStreak: 'ativo',
  dataUltimaRenovacaoEscudo: '2026-09-07',
};

describe('verificarMarco', () => {
  it('retorna o marco quando o streak novo cruza um marco ainda não atingido', () => {
    expect(verificarMarco(2, 3, [])).toBe(3);
    expect(verificarMarco(6, 7, [3])).toBe(7);
  });

  it('retorna null quando não cruza nenhum marco', () => {
    expect(verificarMarco(3, 4, [3])).toBeNull();
    expect(verificarMarco(10, 11, [3, 7])).toBeNull();
  });

  it('retorna null quando o marco já está em marcosAtingidos', () => {
    expect(verificarMarco(2, 3, [3])).toBeNull();
  });
});

describe('calcularProgressoProximoMarco', () => {
  it('0 dias: próximo marco é 3, faltam 3, fração 0', () => {
    expect(calcularProgressoProximoMarco(0)).toEqual({
      proximoMarco: 3,
      diasFaltantes: 3,
      fracaoPreenchida: 0,
    });
  });

  it('logo depois de cruzar um marco: fração reinicia em 0', () => {
    expect(calcularProgressoProximoMarco(3)).toEqual({
      proximoMarco: 7,
      diasFaltantes: 4,
      fracaoPreenchida: 0,
    });
  });

  it('no meio do caminho entre dois marcos: fração proporcional', () => {
    // entre 7 e 14: dia 10 -> 3 de 7 dias percorridos
    const resultado = calcularProgressoProximoMarco(10);
    expect(resultado.proximoMarco).toBe(14);
    expect(resultado.diasFaltantes).toBe(4);
    expect(resultado.fracaoPreenchida).toBeCloseTo(3 / 7, 5);
  });

  it('exatamente no marco final (90): não há próximo marco', () => {
    expect(calcularProgressoProximoMarco(90)).toEqual({
      proximoMarco: null,
      diasFaltantes: 0,
      fracaoPreenchida: 1,
    });
  });

  it('além do último marco: continua sem próximo marco', () => {
    expect(calcularProgressoProximoMarco(150).proximoMarco).toBeNull();
  });
});

describe('deveRenovarEscudo', () => {
  it('retorna true quando nunca foi renovado (data muito antiga)', () => {
    expect(
      deveRenovarEscudo(
        new Date('2020-01-01T00:00:00Z'),
        new Date('2026-09-09T00:00:00Z'),
      ),
    ).toBe(true);
  });

  it('retorna false quando já foi renovado nesta mesma semana', () => {
    // 2026-09-07 é segunda-feira; 2026-09-09 é quarta da mesma semana
    expect(
      deveRenovarEscudo(
        new Date('2026-09-07T00:00:00Z'),
        new Date('2026-09-09T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('retorna true quando a última renovação foi na semana passada', () => {
    // 2026-08-31 é segunda da semana anterior; 2026-09-07 é a segunda seguinte
    expect(
      deveRenovarEscudo(
        new Date('2026-08-31T00:00:00Z'),
        new Date('2026-09-07T00:00:00Z'),
      ),
    ).toBe(true);
  });
});

describe('renovarEscudo', () => {
  it('define escudosDisponiveis como 1 e atualiza dataUltimaRenovacaoEscudo', () => {
    const estado: EstadoStreak = { ...estadoBase, escudosDisponiveis: 0 };
    const resultado = renovarEscudo(estado, new Date('2026-09-07T00:00:00Z'));
    expect(resultado.escudosDisponiveis).toBe(1);
    expect(resultado.dataUltimaRenovacaoEscudo).toBe('2026-09-07');
  });

  it('não altera os demais campos do estado', () => {
    const estado: EstadoStreak = { ...estadoBase, streakAtual: 7 };
    const resultado = renovarEscudo(estado, new Date('2026-09-07T00:00:00Z'));
    expect(resultado.streakAtual).toBe(7);
    expect(resultado.diasTotaisAtivos).toBe(estadoBase.diasTotaisAtivos);
  });
});

describe('inicializarPrimeiroDia', () => {
  it('usuário novo (ultimoDiaAtivo vazio): só marca hoje, sem mexer em mais nada', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 0,
      diasTotaisAtivos: 0,
      escudosDisponiveis: 1,
      marcosAtingidos: [],
      ultimoDiaAtivo: '',
    };

    const resultado = inicializarPrimeiroDia(estado, '2026-09-08');

    expect(resultado).toEqual({
      ...estado,
      ultimoDiaAtivo: '2026-09-08',
    });
  });

  it('não penaliza: streakAtual, diasTotaisAtivos e escudosDisponiveis continuam exatamente iguais', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 0,
      diasTotaisAtivos: 0,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '',
    };

    const resultado = inicializarPrimeiroDia(estado, '2026-09-08');

    expect(resultado.streakAtual).toBe(0);
    expect(resultado.diasTotaisAtivos).toBe(0);
    expect(resultado.escudosDisponiveis).toBe(1);
    expect(resultado.statusStreak).toBe('ativo');
  });
});

describe('aplicarResultadoDia', () => {
  it('dia cumprido: incrementa streakAtual e diasTotaisAtivos, não mexe no escudo', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 4,
      diasTotaisAtivos: 10,
      ultimoDiaAtivo: '2026-09-08',
    };
    const resultado = aplicarResultadoDia(estado, 'cumprido', true, '2026-09-09');

    expect(resultado.streakAtual).toBe(5);
    expect(resultado.diasTotaisAtivos).toBe(11);
    expect(resultado.statusDiaResultante).toBe('cumprido');
    expect(resultado.escudosDisponiveis).toBe(1);
  });

  it('dia não cumprido com escudo disponível: consome o escudo e mantém o streak', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 4,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '2026-09-08',
    };
    const resultado = aplicarResultadoDia(estado, 'nao_cumprido', true, '2026-09-09');

    expect(resultado.streakAtual).toBe(4);
    expect(resultado.escudosDisponiveis).toBe(0);
    expect(resultado.statusDiaResultante).toBe('protegido_escudo');
  });

  it('dia não cumprido sem escudo: streak cai para 50% (floor)', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 5,
      escudosDisponiveis: 0,
      ultimoDiaAtivo: '2026-09-08',
    };
    const resultado = aplicarResultadoDia(estado, 'nao_cumprido', false, '2026-09-09');

    expect(resultado.streakAtual).toBe(2);
    expect(resultado.statusDiaResultante).toBe('perdido');
  });

  it('2+ dias seguidos sem atividade: streak zera mesmo com escudo disponível', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 10,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '2026-09-05',
    };
    // gap de 4 dias entre ultimoDiaAtivo e hoje
    const resultado = aplicarResultadoDia(estado, 'nao_cumprido', true, '2026-09-09');

    expect(resultado.streakAtual).toBe(0);
    expect(resultado.statusDiaResultante).toBe('perdido');
    expect(resultado.escudosDisponiveis).toBe(1);
  });

  it('2+ dias seguidos sem atividade: statusStreak vira pausado', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 10,
      statusStreak: 'ativo',
      ultimoDiaAtivo: '2026-09-05',
    };
    const resultado = aplicarResultadoDia(estado, 'nao_cumprido', true, '2026-09-09');

    expect(resultado.statusStreak).toBe('pausado');
  });

  it('não mexe em statusStreak fora do caminho de gap (dia cumprido, escudo, ou perdido isolado)', () => {
    const estadoPausado: EstadoStreak = { ...estadoBase, statusStreak: 'pausado' };

    const cumprido = aplicarResultadoDia(estadoPausado, 'cumprido', true, '2026-09-09');
    expect(cumprido.statusStreak).toBe('pausado');

    const comEscudo = aplicarResultadoDia(estadoPausado, 'nao_cumprido', true, '2026-09-09');
    expect(comEscudo.statusStreak).toBe('pausado');

    const semEscudo = aplicarResultadoDia(estadoPausado, 'nao_cumprido', false, '2026-09-09');
    expect(semEscudo.statusStreak).toBe('pausado');
  });

  it('diasTotaisAtivos nunca reseta, nem no caminho de reset por gap', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      diasTotaisAtivos: 25,
      ultimoDiaAtivo: '2026-09-01',
    };
    const resultado = aplicarResultadoDia(estado, 'nao_cumprido', false, '2026-09-09');
    expect(resultado.diasTotaisAtivos).toBe(25);
  });

  it('sinaliza marcoAtingido quando o dia cumprido cruza um marco', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 2,
      marcosAtingidos: [],
      ultimoDiaAtivo: '2026-09-08',
    };
    const resultado = aplicarResultadoDia(estado, 'cumprido', true, '2026-09-09');

    expect(resultado.marcoAtingido).toBe(3);
    expect(resultado.marcosAtingidos).toEqual([3]);
  });

  it('não sinaliza marco quando não cruza nenhum', () => {
    const estado: EstadoStreak = {
      ...estadoBase,
      streakAtual: 3,
      marcosAtingidos: [3],
      ultimoDiaAtivo: '2026-09-08',
    };
    const resultado = aplicarResultadoDia(estado, 'cumprido', true, '2026-09-09');

    expect(resultado.marcoAtingido).toBeNull();
    expect(resultado.marcosAtingidos).toEqual([3]);
  });

  it('primeira avaliação sem ultimoDiaAtivo (usuário novo) não aciona o caminho de gap', () => {
    const estado: EstadoStreak = { ...estadoBase, streakAtual: 0, ultimoDiaAtivo: '' };
    const resultado = aplicarResultadoDia(estado, 'cumprido', true, '2026-09-09');

    expect(resultado.streakAtual).toBe(1);
    expect(resultado.statusDiaResultante).toBe('cumprido');
  });
});
