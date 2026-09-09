import { avaliarDiaCumprido, calcularStatusDia } from './streak';
import { Tarefa } from './types';

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
