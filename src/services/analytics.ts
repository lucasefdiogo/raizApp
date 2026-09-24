import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import {
  AcaoIntercept,
  EstadoTela,
  EstadoTravado,
  OrigemSessaoFoco,
  ResultadoSessaoFoco,
  TipoTarefa,
} from '../domain/types';

function analytics() {
  return getAnalytics();
}

/**
 * Uma função por evento — não um `logEvento(nome, params)` genérico
 * espalhado pelo código. Assim erro de digitação no nome do evento ou
 * inconsistência de parâmetro entre features vira erro de TypeScript, não
 * um evento fantasma só descoberto meses depois no Firebase Console.
 */
export function logTarefaCriada(essencial: boolean, tipo: TipoTarefa): void {
  logEvent(analytics(), 'tarefa_criada', { essencial, tipo });
}

/** Só ao marcar como concluída — nunca ao desmarcar (ver useDailyTasks). */
export function logTarefaConcluida(
  essencial: boolean,
  tipo: TipoTarefa,
): void {
  logEvent(analytics(), 'tarefa_concluida', { essencial, tipo });
}

export function logMarcoStreakAtingido(marco: number): void {
  logEvent(analytics(), 'marco_streak_atingido', { marco });
}

export function logAppBloqueadoDetectado(): void {
  logEvent(analytics(), 'app_bloqueado_detectado');
}

export function logAppDesbloqueado(
  metodo: 'tarefas' | 'respiracao',
  nivel: 1 | 2 | 3,
): void {
  logEvent(analytics(), 'app_desbloqueado', { metodo, nivel });
}

export function logDesafioConcluido(tipo: string): void {
  logEvent(analytics(), 'desafio_concluido', { tipo });
}

export function logOnboardingConcluido(): void {
  logEvent(analytics(), 'onboarding_concluido');
}

/** Só ao concluir o último slide — não ao pular nos slides anteriores (ver
 * TutorialScreen). */
export function logTutorialConcluido(): void {
  logEvent(analytics(), 'tutorial_concluido');
}

export function logTourFuncionalidadesConcluido(): void {
  logEvent(analytics(), 'tour_funcionalidades_concluido');
}

export function logTourFuncionalidadesPulado(passoQuePulou: number): void {
  logEvent(analytics(), 'tour_funcionalidades_pulado', {
    passo: passoQuePulou,
  });
}

export function logPermissaoAccessibility(concedida: boolean): void {
  logEvent(analytics(), 'permissao_accessibility', { concedida });
}

export function logPermissaoNotificacao(concedida: boolean): void {
  logEvent(analytics(), 'permissao_notificacao', { concedida });
}

export function logTravadoAberto(origem: OrigemSessaoFoco): void {
  logEvent(analytics(), 'travado_opened', { origem });
}

/**
 * Chip escolhido no Passo 1 do TravadoFlow. Não é dado sensível em si (só
 * qual categoria, sem texto livre) — a spec (seção 7/10) trata isso junto
 * de `estadoTravado`, então mantemos o evento sem nenhum identificador de
 * usuário, mesmo padrão de todo o resto deste arquivo.
 */
export function logTravadoEstado(estado: EstadoTravado): void {
  logEvent(analytics(), 'travado_state', { estado });
}

export function logInterceptShown(estadoTela: EstadoTela): void {
  logEvent(analytics(), 'intercept_shown', { estado_tela: estadoTela });
}

export function logInterceptAction(acao: AcaoIntercept): void {
  logEvent(analytics(), 'intercept_action', { acao });
}

export function logFocusSessionEnd(
  duracaoPlanejadaSeg: number,
  resultado: ResultadoSessaoFoco,
): void {
  logEvent(analytics(), 'focus_session_end', {
    duracao_planejada: duracaoPlanejadaSeg,
    resultado,
  });
}
