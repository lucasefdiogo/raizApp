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
  /**
   * Presente só quando essa tarefa nasceu de uma tarefa recorrente
   * (users/{uid}/essentialTasks/{id}) — aponta pro documento de origem.
   * Ausente = tarefa avulsa (comportamento de sempre, sem mudança).
   */
  origemRecorrenteId?: string;
  /**
   * Presente só quando essa tarefa nasceu do passo `confusao` do TravadoFlow
   * (ver domain/intercept.ts) — aponta pra tarefa original que estava
   * travando. Ausente = tarefa normal, não é subtarefa de ninguém.
   */
  tarefaPaiId?: string;
  /**
   * "HH:mm" — intenção de implementação (se-então, ver Fundamentação
   * Teórica 10.2). Usado por selecionarTarefaIntercept pra escolher, entre
   * as essenciais pendentes, a de horário mais próximo do momento atual.
   * Ausente = sem horário definido.
   */
  quando?: string;
}

export interface DailyLog {
  data: string;
  tarefas: Tarefa[];
  statusDia: StatusDia;
  escudoUsado: boolean;
  /**
   * Quantos desbloqueios de apps bloqueados já aconteceram hoje (total,
   * somando todos os apps — ver domain/appBlockEscalation.ts). Ausente =
   * nenhum ainda (trata como 0); reseta sozinho todo dia por já ser um
   * documento por data.
   */
  desbloqueiosApps?: number;
  /**
   * Sessões de foco do dia (2/5/10 min, ver domain/intercept.ts). Ausente =
   * nenhuma ainda. NÃO contam para streakAtual — só a conclusão de tarefa
   * essencial conta (regra 1.1 inalterada).
   */
  sessoesFoco?: SessaoFoco[];
  /**
   * Interceptações do dia (app bloqueado detectado, ver domain/intercept.ts).
   * Ausente = nenhuma ainda.
   */
  interceptacoes?: Interceptacao[];
}

/** De onde a sessão de foco começou — muda o que fica disponível em FimSessao. */
export type OrigemSessaoFoco = 'interceptacao' | 'travado' | 'home';

/**
 * Chip escolhido no Passo 1 do TravadoFlow ("O que está pegando agora?").
 * Dado emocional — fica só no documento do próprio usuário, nunca em
 * eventos de Analytics vinculados a identificador (ver seção 7 da spec).
 */
export type EstadoTravado = 'confusao' | 'medo' | 'tedio' | 'energia';

export type ResultadoSessaoFoco =
  | 'continuou'
  | 'concluiu_tarefa'
  | 'parou'
  | 'liberou_app';

export interface SessaoFoco {
  id: string;
  tarefaId: string | null;
  origem: OrigemSessaoFoco;
  estadoTravado: EstadoTravado | null;
  duracaoPlanejadaSeg: number;
  duracaoRealSeg: number;
  resultado: ResultadoSessaoFoco;
  /** ISO 8601 completo (data + hora), gerado no momento do registro. */
  criadoEm: string;
}

/** Estado da InterceptScreen exibido — ver domain/intercept.ts. */
export type EstadoTela = 'A' | 'B' | 'C';

export type AcaoIntercept = 'sessao' | 'travado' | 'desafio' | 'liberou' | 'saiu';

export interface Interceptacao {
  /** Package name do app que disparou a interceptação. */
  app: string;
  /** ISO 8601 completo (data + hora). */
  hora: string;
  estadoTela: EstadoTela;
  acao: AcaoIntercept;
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

/**
 * Uma janela de bloqueio dentro de `RegrasBloqueio` — "HH:mm" + dias da
 * semana em que se aplica (0 = domingo, segue Date.getDay()).
 */
export interface JanelaBloqueio {
  inicio: string;
  fim: string;
  diasSemana: number[];
}

/**
 * Regras de bloqueio vigentes (ponte fuga→tarefa, seção 6/7 da spec 09) —
 * ainda NÃO é o schema usado pelo bloqueio de apps em produção
 * (ver BloqueioAppsConfig/useAppBlockConfig, que segue sendo a fonte de
 * verdade até a migração acontecer). ausente em users/{uid} = usuário nunca
 * configurou pelo fluxo novo.
 */
export interface RegrasBloqueio {
  apps: string[];
  janelas: JanelaBloqueio[];
}

/**
 * Alteração que AFROUXA as regras vigentes (remover app, encurtar janela) —
 * só passa a valer em `efetivaEm` (YYYY-MM-DD). Alterações que endurecem
 * gravam direto em `regrasBloqueio`, sem passar por aqui. Ver
 * aplicarRegrasBloqueioPendentesSeVencidas em domain/appBlock.ts.
 */
export interface RegrasBloqueioPendentes extends RegrasBloqueio {
  efetivaEm: string;
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
