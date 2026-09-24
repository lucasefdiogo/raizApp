import { Interceptacao, SessaoFoco, Tarefa } from './types';
import { paraMinutosDoDia } from './appBlock';

// Durações fixas dos timers do TravadoFlow/SessaoFocoScreen (seção 4/5 da
// spec 09-ponte-fuga-tarefa) — sempre o passo mínimo, nunca a tarefa
// inteira (princípio 1: reduzir a ameaça percebida).
export const DURACAO_SEG_CONFUSAO = 2 * 60;
export const DURACAO_SEG_MEDO = 5 * 60;
export const DURACAO_SEG_TEDIO = 5 * 60;
export const DURACAO_SEG_DESCANSO_ENERGIA = 10 * 60;
/** "Continuar mais 10 minutos" em FimSessao — sempre 10 min, não importa a duração original. */
export const DURACAO_SEG_CONTINUAR = 10 * 60;
/** "Fazer 2 minutos" — ação primária do estado A da InterceptScreen (seção 3). */
export const DURACAO_SEG_FAZER_2_MINUTOS = 2 * 60;

/**
 * Projeção do dia usada pela InterceptScreen (seção 3 da spec
 * 09-ponte-fuga-tarefa) — é o que o lado nativo espelha em SharedPreferences
 * e passa como `initialProps.snapshot` (seção 8), não o DailyLog inteiro.
 */
export interface SnapshotDia {
  tarefas: Tarefa[];
}

export type ResultadoIntercept =
  | { estado: 'A'; tarefa: Tarefa }
  | { estado: 'B' }
  | { estado: 'C' };

function distanciaEmMinutos(quando: string, agora: Date): number | null {
  const minutosQuando = paraMinutosDoDia(quando);
  if (minutosQuando === null) {
    return null;
  }
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  return Math.abs(minutosQuando - minutosAgora);
}

/**
 * Entre as essenciais pendentes, escolhe a de `quando` mais próximo de
 * `agora`; sem nenhum `quando` preenchido, a primeira pendente (ordem do
 * array, igual ao resto do app — ver dailyTasks.ts). `quando` inválido
 * (não "HH:mm") conta como ausente.
 */
function escolherEntrePendentes(pendentes: Tarefa[], agora: Date): Tarefa {
  let escolhida = pendentes[0];
  let menorDistancia: number | null = null;

  for (const tarefa of pendentes) {
    if (!tarefa.quando) {
      continue;
    }
    const distancia = distanciaEmMinutos(tarefa.quando, agora);
    if (distancia === null) {
      continue;
    }
    if (menorDistancia === null || distancia < menorDistancia) {
      menorDistancia = distancia;
      escolhida = tarefa;
    }
  }

  return escolhida;
}

/**
 * Estado A/B/C da InterceptScreen (seção 3):
 * - A: existe essencial pendente → primeira, ou a de `quando` mais próximo
 *   de `agora` quando houver alguma com horário definido.
 * - B: todas as essenciais já concluídas (existe pelo menos 1).
 * - C: nenhuma essencial cadastrada hoje (com ou sem tarefas comuns).
 */
export function selecionarTarefaIntercept(
  snapshot: SnapshotDia,
  agora: Date = new Date(),
): ResultadoIntercept {
  const essenciais = snapshot.tarefas.filter(tarefa => tarefa.essencial);
  const pendentes = essenciais.filter(tarefa => !tarefa.concluida);

  if (pendentes.length > 0) {
    return { estado: 'A', tarefa: escolherEntrePendentes(pendentes, agora) };
  }

  if (essenciais.length > 0) {
    return { estado: 'B' };
  }

  return { estado: 'C' };
}

/** Acrescenta `sessao` ao histórico do dia. Não valida — quem monta o objeto é quem decide os valores (UI/hook, na Etapa 2). */
export function registrarSessaoFoco(
  sessoesFoco: SessaoFoco[],
  sessao: SessaoFoco,
): SessaoFoco[] {
  return [...sessoesFoco, sessao];
}

/** Acrescenta `interceptacao` ao histórico do dia. */
export function registrarInterceptacao(
  interceptacoes: Interceptacao[],
  interceptacao: Interceptacao,
): Interceptacao[] {
  return [...interceptacoes, interceptacao];
}
