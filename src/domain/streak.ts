import {
  EstadoStreak,
  StatusDia,
  StatusDiaResultante,
  StatusStreak,
  Tarefa,
} from './types';

const PROPORCAO_MINIMA_CUMPRIMENTO = 0.6;

export function existeEssencialConcluida(tarefas: Tarefa[]): boolean {
  return tarefas.some(tarefa => tarefa.essencial && tarefa.concluida);
}

/**
 * Dia cumprido = pelo menos 1 tarefa essencial concluída, ou 60% das tarefas
 * do dia concluídas (regra de negócio definida na fundamentação do produto).
 */
export function avaliarDiaCumprido(tarefas: Tarefa[]): boolean {
  if (tarefas.length === 0) {
    return false;
  }

  if (existeEssencialConcluida(tarefas)) {
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

const MARCOS_STREAK = [3, 7, 14, 30, 60, 90];

/**
 * Retorna o marco cruzado na transição de streakAnterior -> streakNovo, se
 * houver um que ainda não esteja em marcosAtingidos. Como o streak só sobe
 * de 1 em 1, no máximo um marco é cruzado por chamada.
 */
export function verificarMarco(
  streakAnterior: number,
  streakNovo: number,
  marcosAtingidos: number[],
): number | null {
  const marco = MARCOS_STREAK.find(
    m => streakNovo >= m && streakAnterior < m && !marcosAtingidos.includes(m),
  );
  return marco ?? null;
}

function diferencaEmDias(dataAnterior: string, dataAtual: string): number {
  const anterior = new Date(`${dataAnterior}T00:00:00Z`).getTime();
  const atual = new Date(`${dataAtual}T00:00:00Z`).getTime();
  return Math.round((atual - anterior) / (1000 * 60 * 60 * 24));
}

export interface ResultadoAplicacaoDia {
  streakAtual: number;
  diasTotaisAtivos: number;
  escudosDisponiveis: number;
  marcosAtingidos: number[];
  statusDiaResultante: StatusDiaResultante;
  statusStreak: StatusStreak;
  marcoAtingido: number | null;
}

/**
 * Aplica o resultado de um dia já fechado (normalmente "ontem", comparado a
 * ultimoDiaAtivo) sobre o estado atual do streak. Pré-condição: hoje deve
 * ser posterior a estadoAtual.ultimoDiaAtivo — a função não foi desenhada
 * para reavaliar um dia já processado.
 *
 * Se hoje estiver 2+ dias à frente de ultimoDiaAtivo, houve pelo menos dois
 * dias seguidos sem cumprir (o app nem chegou a ser aberto nesse intervalo),
 * o que zera o streak direto — o escudo não é consultado nesse caso, porque
 * ele protege uma falha isolada, não um sumiço de vários dias. statusStreak
 * vira 'pausado' nesse caminho — só a tela de retorno após pausa reverte
 * isso para 'ativo' de novo, essa função nunca reverte sozinha.
 */
export function aplicarResultadoDia(
  estadoAtual: EstadoStreak,
  statusDia: 'cumprido' | 'nao_cumprido',
  temEscudoDisponivel: boolean,
  hoje: string,
): ResultadoAplicacaoDia {
  const diasSemAtividade = estadoAtual.ultimoDiaAtivo
    ? diferencaEmDias(estadoAtual.ultimoDiaAtivo, hoje)
    : 1;

  if (diasSemAtividade >= 2) {
    return {
      streakAtual: 0,
      diasTotaisAtivos: estadoAtual.diasTotaisAtivos,
      escudosDisponiveis: estadoAtual.escudosDisponiveis,
      marcosAtingidos: estadoAtual.marcosAtingidos,
      statusDiaResultante: 'perdido',
      statusStreak: 'pausado',
      marcoAtingido: null,
    };
  }

  if (statusDia === 'cumprido') {
    const streakNovo = estadoAtual.streakAtual + 1;
    const marco = verificarMarco(
      estadoAtual.streakAtual,
      streakNovo,
      estadoAtual.marcosAtingidos,
    );
    return {
      streakAtual: streakNovo,
      diasTotaisAtivos: estadoAtual.diasTotaisAtivos + 1,
      escudosDisponiveis: estadoAtual.escudosDisponiveis,
      marcosAtingidos:
        marco !== null
          ? [...estadoAtual.marcosAtingidos, marco]
          : estadoAtual.marcosAtingidos,
      statusDiaResultante: 'cumprido',
      statusStreak: estadoAtual.statusStreak,
      marcoAtingido: marco,
    };
  }

  if (temEscudoDisponivel) {
    return {
      streakAtual: estadoAtual.streakAtual,
      diasTotaisAtivos: estadoAtual.diasTotaisAtivos,
      escudosDisponiveis: 0,
      marcosAtingidos: estadoAtual.marcosAtingidos,
      statusDiaResultante: 'protegido_escudo',
      statusStreak: estadoAtual.statusStreak,
      marcoAtingido: null,
    };
  }

  return {
    streakAtual: Math.floor(estadoAtual.streakAtual * 0.5),
    diasTotaisAtivos: estadoAtual.diasTotaisAtivos,
    escudosDisponiveis: estadoAtual.escudosDisponiveis,
    marcosAtingidos: estadoAtual.marcosAtingidos,
    statusDiaResultante: 'perdido',
    statusStreak: estadoAtual.statusStreak,
    marcoAtingido: null,
  };
}

function inicioDaSemana(data: Date): Date {
  const inicio = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()),
  );
  const diaDaSemana = inicio.getUTCDay();
  const deslocamento = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  inicio.setUTCDate(inicio.getUTCDate() - deslocamento);
  return inicio;
}

/**
 * A semana começa na segunda-feira. Compara o início da semana da última
 * renovação com o início da semana atual — evita renovar duas vezes se o
 * app for aberto mais de uma vez na mesma semana.
 */
export function deveRenovarEscudo(dataUltimaRenovacao: Date, agora: Date): boolean {
  return inicioDaSemana(dataUltimaRenovacao).getTime() < inicioDaSemana(agora).getTime();
}

export function renovarEscudo(estadoAtual: EstadoStreak, hoje: Date): EstadoStreak {
  return {
    ...estadoAtual,
    escudosDisponiveis: 1,
    dataUltimaRenovacaoEscudo: hoje.toISOString().slice(0, 10),
  };
}
