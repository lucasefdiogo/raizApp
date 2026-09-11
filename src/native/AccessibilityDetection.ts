import { DeviceEventEmitter, NativeModules } from 'react-native';
import { BloqueioAppsConfig } from '../domain/types';

/** Mesmo nome do evento emitido pelo RootoraAccessibilityService.kt. */
const EVENTO_APP_PRIMEIRO_PLANO = 'app-foreground-changed';
/** Mesmo nome do evento emitido pela MainActivity.kt (app já em primeiro
 * plano — cold start usa getInitialBlockedPackage em vez de evento). */
const EVENTO_APP_BLOQUEADO = 'blocked-app-detected';

/** Formato que o módulo nativo devolve — ícone em base64 puro, sem prefixo. */
interface AppInstaladoNativo {
  packageName: string;
  nome: string;
  icone: string | null;
}

export interface AppInstalado {
  packageName: string;
  nome: string;
  /** Data URI pronta pra <Image source={{ uri: icone }} />, ou null. */
  icone: string | null;
}

interface RootoraAccessibilityNative {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  getInstalledApps(): Promise<AppInstaladoNativo[]>;
  syncBloqueioConfig(configJson: string): void;
  registrarDesbloqueioTemporario(packageName: string, minutos: number): void;
  getInitialBlockedPackage(): Promise<string | null>;
}

interface EventoAppPrimeiroPlano {
  packageName?: string;
}

interface EventoAppBloqueado {
  packageName?: string;
}

/**
 * Lido a cada chamada (não no load) — assim o módulo pode não estar linkado
 * (build sem o nativo, ou Jest sem mock) sem quebrar o import, e os testes
 * conseguem injetar o mock.
 */
function moduloNativo(): RootoraAccessibilityNative | undefined {
  return NativeModules.RootoraAccessibility as
    | RootoraAccessibilityNative
    | undefined;
}

/**
 * true só quando o Accessibility Service do Rootora está de fato habilitado
 * nas configurações do sistema. Sem o módulo nativo (ex: build antigo),
 * resolve `false` em vez de rejeitar.
 */
export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  const modulo = moduloNativo();
  if (!modulo) {
    return false;
  }
  return modulo.isAccessibilityServiceEnabled();
}

/**
 * Abre a tela de Acessibilidade do sistema. Habilitar o serviço é uma ação
 * manual do usuário lá — não existe diálogo de permissão comum pra isso.
 */
export function openAccessibilitySettings(): void {
  moduloNativo()?.openAccessibilitySettings();
}

/**
 * Apps instalados pelo usuário (sem apps de sistema, sem o próprio Rootora
 * — filtrados do lado nativo). Sem o módulo nativo, resolve lista vazia.
 * Não cacheia aqui — quem chama decide se guarda em memória (useAppBlockConfig
 * só busca 1x por montagem da tela).
 */
export async function getInstalledApps(): Promise<AppInstalado[]> {
  const modulo = moduloNativo();
  if (!modulo) {
    return [];
  }
  const apps = await modulo.getInstalledApps();
  return apps.map(app => ({
    packageName: app.packageName,
    nome: app.nome,
    icone: app.icone ? `data:image/png;base64,${app.icone}` : null,
  }));
}

/**
 * Registra um callback pra cada troca de app em primeiro plano detectada.
 * Retorna a função de unsubscribe.
 */
export function subscribeToForegroundApp(
  callback: (packageName: string) => void,
): () => void {
  const subscription = DeviceEventEmitter.addListener(
    EVENTO_APP_PRIMEIRO_PLANO,
    (evento: EventoAppPrimeiroPlano) => {
      if (evento && typeof evento.packageName === 'string') {
        callback(evento.packageName);
      }
    },
  );
  return () => subscription.remove();
}

/**
 * Espelha a config de bloqueio em SharedPreferences do lado nativo — o
 * AccessibilityService roda fora do ciclo de vida do React e precisa ler
 * essa config de forma síncrona a cada troca de app, sem depender de uma
 * ponte ao vivo com o JS. Sem o módulo nativo, não faz nada (mesma postura
 * de openAccessibilitySettings).
 */
export function syncBloqueioConfig(config: BloqueioAppsConfig): void {
  moduloNativo()?.syncBloqueioConfig(JSON.stringify(config));
}

/**
 * Libera packageName do bloqueio por `minutos` a partir de agora. Grava no
 * lado nativo (SharedPreferences) — é o que o AccessibilityService consulta
 * antes de reabrir o Rootora por cima do app.
 */
export function registrarDesbloqueioTemporario(
  packageName: string,
  minutos: number,
): void {
  moduloNativo()?.registrarDesbloqueioTemporario(packageName, minutos);
}

/**
 * Consome (uma única vez) o packageName bloqueado que veio no intent de
 * cold start — quando o Rootora é aberto pela primeira vez já a partir do
 * bloqueio, não existe ReactContext ainda pra emitir EVENTO_APP_BLOQUEADO a
 * tempo de algum listener JS captar. Sem o módulo nativo, resolve null.
 */
export async function getInitialBlockedPackage(): Promise<string | null> {
  const modulo = moduloNativo();
  if (!modulo) {
    return null;
  }
  return modulo.getInitialBlockedPackage();
}

/**
 * Registra um callback pra cada vez que o AccessibilityService detecta um
 * app bloqueado em primeiro plano com o app já aberto (ReactContext vivo).
 * Retorna a função de unsubscribe.
 */
export function subscribeToBlockedApp(
  callback: (packageName: string) => void,
): () => void {
  const subscription = DeviceEventEmitter.addListener(
    EVENTO_APP_BLOQUEADO,
    (evento: EventoAppBloqueado) => {
      if (evento && typeof evento.packageName === 'string') {
        callback(evento.packageName);
      }
    },
  );
  return () => subscription.remove();
}
