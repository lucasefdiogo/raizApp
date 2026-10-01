import { selecionarTarefaIntercept } from './intercept';
import { Tarefa } from './types';

function tarefa(overrides: Partial<Tarefa> = {}): Tarefa {
  return {
    id: overrides.id ?? '1',
    titulo: overrides.titulo ?? 'tarefa',
    essencial: overrides.essencial ?? true,
    concluida: overrides.concluida ?? false,
    ...overrides,
  };
}

function horas(h: number, m: number): Date {
  const data = new Date('2026-09-24T00:00:00');
  data.setHours(h, m, 0, 0);
  return data;
}

describe('selecionarTarefaIntercept', () => {
  it('estado C: nenhuma essencial cadastrada hoje (mesmo com tarefa comum)', () => {
    const resultado = selecionarTarefaIntercept({
      tarefas: [tarefa({ essencial: false })],
    });
    expect(resultado).toEqual({ estado: 'C' });
  });

  it('estado C: nenhuma tarefa cadastrada hoje', () => {
    expect(selecionarTarefaIntercept({ tarefas: [] })).toEqual({
      estado: 'C',
    });
  });

  it('estado B: todas as essenciais já concluídas', () => {
    const resultado = selecionarTarefaIntercept({
      tarefas: [
        tarefa({ id: '1', concluida: true }),
        tarefa({ id: '2', concluida: true }),
        tarefa({ id: '3', essencial: false, concluida: false }),
      ],
    });
    expect(resultado).toEqual({ estado: 'B' });
  });

  it('estado A: uma essencial pendente, sem quando', () => {
    const pendente = tarefa({ id: '1', concluida: false });
    const resultado = selecionarTarefaIntercept({
      tarefas: [pendente, tarefa({ id: '2', concluida: true })],
    });
    expect(resultado).toEqual({ estado: 'A', tarefa: pendente });
  });

  it('estado A: sem nenhum quando preenchido, escolhe a primeira pendente (ordem do array)', () => {
    const primeira = tarefa({ id: '1', concluida: false });
    const segunda = tarefa({ id: '2', concluida: false });
    const resultado = selecionarTarefaIntercept({
      tarefas: [primeira, segunda],
    });
    expect(resultado).toEqual({ estado: 'A', tarefa: primeira });
  });

  it('estado A: prioriza a pendente com quando mais próximo do horário atual', () => {
    const longe = tarefa({ id: '1', concluida: false, quando: '08:00' });
    const perto = tarefa({ id: '2', concluida: false, quando: '12:15' });
    const resultado = selecionarTarefaIntercept(
      { tarefas: [longe, perto] },
      horas(12, 0),
    );
    expect(resultado).toEqual({ estado: 'A', tarefa: perto });
  });

  it('estado A: pendente com quando é priorizada sobre pendente sem quando, mesmo vindo depois no array', () => {
    const semQuando = tarefa({ id: '1', concluida: false });
    const comQuando = tarefa({ id: '2', concluida: false, quando: '09:00' });
    const resultado = selecionarTarefaIntercept(
      { tarefas: [semQuando, comQuando] },
      horas(9, 0),
    );
    expect(resultado).toEqual({ estado: 'A', tarefa: comQuando });
  });

  it('estado A: quando inválido é tratado como ausente', () => {
    const invalida = tarefa({ id: '1', concluida: false, quando: 'não-hora' });
    const resultado = selecionarTarefaIntercept(
      { tarefas: [invalida] },
      horas(12, 0),
    );
    expect(resultado).toEqual({ estado: 'A', tarefa: invalida });
  });
});
