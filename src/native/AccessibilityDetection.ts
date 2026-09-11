import { DeviceEventEmitter, NativeModules } from 'react-native';

/** Mesmo nome do evento emitido pelo RootoraAccessibilityService.kt. */
const EVENTO_APP_PRIMEIRO_PLANO = 'app-foreground-changed';

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
}

interface EventoAppPrimeiroPlano {
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
