import { Tarefa } from './types';

/**
 * Teto de tarefas essenciais por dia. Vem da mecânica do produto: o dia é
 * cumprido com pelo menos 1 essencial concluída, e limitar a 3 mantém o
 * foco em poucas vitórias reais em vez de uma lista longa que vira cobrança
 * (ver princípio 1 e 4 do CLAUDE.md).
 */
export const LIMITE_TAREFAS_ESSENCIAIS = 3;

export const MENSAGEM_LIMITE_ESSENCIAIS =
  'Só dá pra marcar até 3 tarefas essenciais por dia';

export const MENSAGEM_TITULO_VAZIO = 'Escreva o que você quer fazer';

export type ResultadoTarefas =
  | { ok: true; tarefas: Tarefa[] }
  | { ok: false; erro: string };

export function contarEssenciais(tarefas: Tarefa[]): number {
  return tarefas.filter(tarefa => tarefa.essencial).length;
}

/**
 * Já bateu no teto de essenciais? A UI usa isso pra antecipar o bloqueio
 * (desabilitar o marcador "essencial") e o hook pra recusar a gravação.
 */
export function limiteEssenciaisAtingido(tarefas: Tarefa[]): boolean {
  return contarEssenciais(tarefas) >= LIMITE_TAREFAS_ESSENCIAIS;
}

export function tituloTarefaValido(titulo: string): boolean {
  return titulo.trim().length > 0;
}

/**
 * Acrescenta `nova` à lista do dia. Recusa (sem alterar nada) título vazio
 * ou uma essencial quando o teto já foi atingido.
 */
export function adicionarTarefa(
  tarefas: Tarefa[],
  nova: Tarefa,
): ResultadoTarefas {
  if (!tituloTarefaValido(nova.titulo)) {
    return { ok: false, erro: MENSAGEM_TITULO_VAZIO };
  }

  if (nova.essencial && limiteEssenciaisAtingido(tarefas)) {
    return { ok: false, erro: MENSAGEM_LIMITE_ESSENCIAIS };
  }

  return { ok: true, tarefas: [...tarefas, { ...nova, titulo: nova.titulo.trim() }] };
}

/**
 * Edita título e/ou o marcador essencial de uma tarefa. Id inexistente é
 * no-op (retorna a lista como veio). Promover uma tarefa a essencial com o
 * teto já atingido é recusado; rebaixar (essencial -> comum) é sempre livre.
 */
export function editarTarefa(
  tarefas: Tarefa[],
  id: string,
  campos: Partial<Pick<Tarefa, 'titulo' | 'essencial'>>,
): ResultadoTarefas {
  const alvo = tarefas.find(tarefa => tarefa.id === id);
  if (!alvo) {
    return { ok: true, tarefas };
  }

  if (campos.titulo !== undefined && !tituloTarefaValido(campos.titulo)) {
    return { ok: false, erro: MENSAGEM_TITULO_VAZIO };
  }

  const viraEssencial = campos.essencial === true && !alvo.essencial;
  if (viraEssencial && limiteEssenciaisAtingido(tarefas)) {
    return { ok: false, erro: MENSAGEM_LIMITE_ESSENCIAIS };
  }

  return {
    ok: true,
    tarefas: tarefas.map(tarefa =>
      tarefa.id === id
        ? {
            ...tarefa,
            ...campos,
            ...(campos.titulo !== undefined
              ? { titulo: campos.titulo.trim() }
              : {}),
          }
        : tarefa,
    ),
  };
}
