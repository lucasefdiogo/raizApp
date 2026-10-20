import { NativeModules } from 'react-native';
import { EventoUso } from '../domain/usoApps';

interface RootoraUsoAppsNative {
  temAcessoUso(): Promise<boolean>;
  abrirConfiguracoesAcessoUso(): void;
  lerEventosUso(inicioMs: number, fimMs: number): Promise<EventoUso[]>;
}

/**
 * Lido a cada chamada (não no load) — o módulo pode não estar linkado
 * (build antigo, ou Jest sem mock) sem quebrar o import.
 */
function moduloNativo(): RootoraUsoAppsNative | undefined {
  return NativeModules.RootoraUsoApps as RootoraUsoAppsNative | undefined;
}

/**
 * true só quando o usuário concedeu "Acesso de uso" ao Rootora nas
 * configurações. Sem o módulo nativo resolve `false` em vez de rejeitar.
 */
export async function temAcessoUso(): Promise<boolean> {
  const modulo = moduloNativo();
  return modulo ? modulo.temAcessoUso() : false;
}

/** Abre a tela "Acesso de uso" do sistema (a concessão é manual). */
export function abrirConfiguracoesAcessoUso(): void {
  moduloNativo()?.abrirConfiguracoesAcessoUso();
}

/**
 * Eventos de primeiro/segundo plano entre inicioMs e fimMs (epoch ms), só
 * dos pacotes da lista curada. Sem o módulo nativo resolve lista vazia.
 */
export async function lerEventosUso(inicioMs: number, fimMs: number): Promise<EventoUso[]> {
  const modulo = moduloNativo();
  return modulo ? modulo.lerEventosUso(inicioMs, fimMs) : [];
}
