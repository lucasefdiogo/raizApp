export type StatusStreak = 'ativo' | 'em_risco' | 'perdido';

export type StatusDia = 'pendente' | 'cumprido' | 'nao_cumprido';

export interface Streak {
  streakAtual: number;
  diasTotaisAtivos: number;
  escudosDisponiveis: number;
  marcosAtingidos: number[];
  ultimoDiaAtivo: string;
  statusStreak: StatusStreak;
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
