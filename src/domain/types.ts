export type StatusStreak = 'ativo' | 'em_risco' | 'perdido';

export type StatusDia = 'pendente' | 'cumprido' | 'nao_cumprido';

/**
 * Resultado final (retrospectivo) da avaliação de um dia já fechado, usado
 * por aplicarResultadoDia. Distinto de StatusDia, que descreve o dia em
 * andamento (inclui 'pendente', que não faz sentido para um dia já fechado).
 */
export type StatusDiaResultante = 'cumprido' | 'protegido_escudo' | 'perdido';

export interface EstadoStreak {
  streakAtual: number;
  diasTotaisAtivos: number;
  escudosDisponiveis: number;
  marcosAtingidos: number[];
  ultimoDiaAtivo: string;
  statusStreak: StatusStreak;
  dataUltimaRenovacaoEscudo: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  essencial: boolean;
  concluida: boolean;
}

export interface DailyLog {
  data: string;
  tarefas: Tarefa[];
  statusDia: StatusDia;
  escudoUsado: boolean;
}

export type FocoProcrastinacao =
  | 'redes_sociais'
  | 'estudos'
  | 'trabalho'
  | 'organizacao_pessoal'
  | 'outro';

export interface OnboardingData {
  porqueTexto: string;
  focoProcrastinacao: FocoProcrastinacao | null;
  tempoTelaEstimado: number | null;
}
