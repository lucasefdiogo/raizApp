import { NativeModules } from 'react-native';
import { EventoAcessibilidade } from '../domain/acessibilidade';

/**
 * Service event recorded by the native side. `id` is opaque and only used to
 * mark the event as sent after it was written to Firestore.
 */
export interface EventoAcessibilidadePendente extends EventoAcessibilidade {
  id: string;
}

interface RootoraAccessibilityNative {
  lerEventosAcessibilidadePendentes(): Promise<EventoAcessibilidadePendente[]>;
  marcarEventosAcessibilidadeEnviados(ids: string[]): Promise<void>;
  verificarDesligamentoNaAbertura(): Promise<void>;
  espelharNotificacoesAtivas(ativas: boolean): void;
}

/**
 * Lido a cada chamada (não no load) — o módulo pode não estar linkado
 * (build antigo, ou Jest sem mock) sem quebrar o import.
 */
function moduloNativo(): RootoraAccessibilityNative | undefined {
  return NativeModules.RootoraAccessibility as
    | RootoraAccessibilityNative
    | undefined;
}

/**
 * Native contract: returns every service on/off event not yet marked as sent,
 * oldest first. Sem o módulo nativo resolve lista vazia.
 */
export async function lerEventosAcessibilidadePendentes(): Promise<
  EventoAcessibilidadePendente[]
> {
  const modulo = moduloNativo();
  return modulo ? modulo.lerEventosAcessibilidadePendentes() : [];
}

/**
 * Native contract: marks the events with these ids as sent so they are not
 * returned again by `lerEventosAcessibilidadePendentes`. Sem o módulo não faz
 * nada.
 */
export async function marcarEventosAcessibilidadeEnviados(
  ids: string[],
): Promise<void> {
  await moduloNativo()?.marcarEventosAcessibilidadeEnviados(ids);
}

/**
 * Native contract (RN-06): on app open the native side checks whether the
 * accessibility service is off and, if so, records a 'desligamento' event
 * (covers kills where onUnbind never ran). Sem o módulo não faz nada.
 */
export async function verificarDesligamentoNaAbertura(): Promise<void> {
  await moduloNativo()?.verificarDesligamentoNaAbertura();
}

/**
 * Native contract (RN-03): mirrors the user's `notificacoesAtivas` setting to
 * the native side, which uses it to decide whether the notice may be shown.
 * Sem o módulo não faz nada.
 */
export function espelharNotificacoesAtivas(ativas: boolean): void {
  moduloNativo()?.espelharNotificacoesAtivas(ativas);
}
