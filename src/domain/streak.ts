import {
  EstadoStreak,
  StatusDia,
  StatusDiaResultante,
  StatusStreak,
  Tarefa,
} from './types';
import { diferencaEmDiasLocal, paraISOLocal } from './data';

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

export const MARCOS_STREAK = [3, 7, 14, 30, 60, 90];

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

export interface ProgressoProximoMarco {
  /** Próximo marco (3/7/14/30/60/90) ainda não atingido, ou null depois do último (90+). */
  proximoMarco: number | null;
  /** Dias que faltam pro próximo marco — 0 quando proximoMarco é null. */
  diasFaltantes: number;
  /**
   * Fração preenchida (0-1) da barra entre o marco anterior (ou 0, se
   * nenhum) e o próximo — reinicia em 0 logo depois de cruzar um marco.
   * 1 quando já passou do último marco (nada mais a preencher).
   */
  fracaoPreenchida: number;
}

/**
 * Progresso do streak atual em direção ao próximo marco — usado pela barra
 * de progresso da animação de regar a raiz (ver RootWateringOverlay).
 */
export function calcularProgressoProximoMarco(
  diasSequencia: number,
): ProgressoProximoMarco {
  const proximoMarco = MARCOS_STREAK.find(m => m > diasSequencia) ?? null;

  if (proximoMarco === null) {
    return { proximoMarco: null, diasFaltantes: 0, fracaoPreenchida: 1 };
  }

  const marcoAnterior =
    [...MARCOS_STREAK].reverse().find(m => m <= diasSequencia) ?? 0;

  return {
    proximoMarco,
    diasFaltantes: proximoMarco - diasSequencia,
    fracaoPreenchida:
      (diasSequencia - marcoAnterior) / (proximoMarco - marcoAnterior),
  };
}

/**
 * Estado inicial de streak pro primeiro dia de uso — ultimoDiaAtivo ainda
 * vazio (usuário novo) ou nunca inicializado (conta legada de antes desta
 * correção). Sem dia anterior, não há o que avaliar: não penaliza, não
 * consome proteção, não incrementa nada — só marca hoje como o ponto de
 * partida, pra que aplicarResultadoDia passe a rodar normalmente a partir
 * de amanhã (ver useStreak.processar(), que decide quando chamar cada uma).
 */
export function inicializarPrimeiroDia(
  estadoAtual: EstadoStreak,
  hoje: string,
): EstadoStreak {
  return { ...estadoAtual, ultimoDiaAtivo: hoje };
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
    ? diferencaEmDiasLocal(estadoAtual.ultimoDiaAtivo, hoje)
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

/**
 * Segunda-feira (00:00 hora LOCAL) da semana que contém `data`. Fonte única
 * do que "semana" significa no produto — reaproveitado pela renovação do
 * escudo e pelos desafios semanais (domain/challenges.ts). Hora local, não
 * UTC — mesmo racional de domain/data.ts: perto da meia-noite local, um
 * cálculo em UTC pode colocar `data` na semana errada.
 */
export function inicioDaSemana(data: Date): Date {
  const diaDaSemana = data.getDay();
  const deslocamento = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() - deslocamento);
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
    dataUltimaRenovacaoEscudo: paraISOLocal(hoje),
  };
}
