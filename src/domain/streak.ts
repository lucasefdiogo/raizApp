import { StatusDia, Tarefa } from './types';

const PROPORCAO_MINIMA_CUMPRIMENTO = 0.6;

/**
 * Dia cumprido = pelo menos 1 tarefa essencial concluída, ou 60% das tarefas
 * do dia concluídas (regra de negócio definida na fundamentação do produto).
 */
export function avaliarDiaCumprido(tarefas: Tarefa[]): boolean {
  if (tarefas.length === 0) {
    return false;
  }

  const temEssencialConcluida = tarefas.some(
    tarefa => tarefa.essencial && tarefa.concluida,
  );
  if (temEssencialConcluida) {
    return true;
  }

  const concluidas = tarefas.filter(tarefa => tarefa.concluida).length;
  return concluidas / tarefas.length >= PROPORCAO_MINIMA_CUMPRIMENTO;
}

export function calcularStatusDia(tarefas: Tarefa[]): StatusDia {
  if (tarefas.length === 0 || tarefas.every(tarefa => !tarefa.concluida)) {
    return 'pendente';
  }
  return avaliarDiaCumprido(tarefas) ? 'cumprido' : 'nao_cumprido';
}
