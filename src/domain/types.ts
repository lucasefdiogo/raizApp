export type StatusStreak = 'ativo' | 'em_risco' | 'perdido' | 'pausado';

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

/**
 * Tipo da tarefa. Ausência do campo (dado legado, gravado antes da Fase 2)
 * é tratada como 'padrao' em todo lugar que lê — nunca assumir que existe.
 */
export type TipoTarefa = 'padrao' | 'exercicio';

export interface Tarefa {
  id: string;
  titulo: string;
  essencial: boolean;
  concluida: boolean;
  /** Opcional. Omitido = 'padrao'. Só 'exercicio' muda algo na UI. */
  tipo?: TipoTarefa;
  /** Opcional, só faz sentido quando tipo === 'exercicio'. Minutos estimados. */
  duracaoMinutos?: number;
}

export interface DailyLog {
  data: string;
  tarefas: Tarefa[];
  statusDia: StatusDia;
  escudoUsado: boolean;
}

export type PeriodoDesafio = 'semanal' | 'mensal';

export type StatusDesafio = 'ativo' | 'concluido' | 'expirado';

/**
 * Tipos do catálogo fixo de desafios (Fase 2). O usuário não cria desafios;
 * `gerarCatalogoDoPeriodo` escolhe qual instanciar por período.
 */
export type TipoDesafio =
  | 'exercicio_3x'
  | 'essencial_todo_dia'
  | 'dias_ativos_20';

export interface Desafio {
  /** Determinístico: `${tipo}-${dataInicio}` — não duplica ao regerar. */
  id: string;
  titulo: string;
  tipo: TipoDesafio;
  periodo: PeriodoDesafio;
  /** ISO YYYY-MM-DD (UTC), inclusivo. */
  dataInicio: string;
  /** ISO YYYY-MM-DD (UTC), inclusivo. */
  dataFim: string;
  meta: number;
  progresso: number;
  status: StatusDesafio;
}

/**
 * Configuração do bloqueio de apps (Fase 3, parte 2 — só a configuração,
 * sem overlay nem desbloqueio ainda). Uma única janela de horário aplicada a
 * todos os apps selecionados — não um horário por app. Ausente em
 * users/{uid} = usuário nunca configurou; tratar como CONFIG_PADRAO
 * (ver useAppBlockConfig), nunca assumir que o campo existe.
 */
export interface BloqueioAppsConfig {
  ativo: boolean;
  /** Package names, ex: "com.instagram.android". */
  appsSelecionados: string[];
  /** "HH:mm", ou null se o usuário nunca salvou um horário. */
  horarioInicio: string | null;
  horarioFim: string | null;
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
