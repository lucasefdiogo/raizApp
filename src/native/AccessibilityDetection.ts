import { DeviceEventEmitter, NativeModules } from 'react-native';
import { EstadoTravado, RegrasBloqueio } from '../domain/types';
import { SnapshotDia } from '../domain/intercept';

/** Mesmo nome do evento emitido pelo RootoraAccessibilityService.kt. */
const EVENTO_APP_PRIMEIRO_PLANO = 'app-foreground-changed';

/**
 * Sessão de foco em andamento (só quando origem === 'interceptacao') — o
 * suficiente pro AccessibilityService (Etapa 4) reconhecer "esse pacote tem
 * um timer rodando" e reabrir a InterceptActivity direto na SessaoFocoScreen
 * em vez da tela de decisão A/B/C (seção 5 da spec: "a interceptação
 * reaparece mostrando o timer em andamento").
 */
export interface SessaoAtivaNativa {
  packageName: string;
  tarefaId: string | null;
  estadoTravado: EstadoTravado | null;
  /** Epoch ms de quando o timer termina. */
  fimEm: number;
}

interface RootoraAccessibilityNative {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  registrarDesbloqueioTemporario(packageName: string, minutos: number): void;
  abrirApp(packageName: string): Promise<boolean>;
  salvarSnapshotDoDia(snapshotJson: string): void;
  salvarRegrasBloqueio(regrasJson: string): void;
  salvarSessaoAtiva(sessaoJson: string): void;
  limparSessaoAtiva(): void;
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
 * Reabre packageName depois de um desbloqueio (estado B ou "Liberar" em
 * FimSessao) — pra o usuário não precisar sair do Rootora manualmente.
 * Resolve false (nunca rejeita) se o app não puder ser reaberto (ex:
 * desinstalado nesse meio tempo) ou sem o módulo nativo — quem chama não
 * deve travar nem mostrar erro nesse caso, já que o desbloqueio em si já
 * foi concedido.
 */
export async function abrirApp(packageName: string): Promise<boolean> {
  const modulo = moduloNativo();
  if (!modulo) {
    return false;
  }
  return modulo.abrirApp(packageName);
}

/**
 * Espelha o snapshot do dia (tarefas essenciais, `quando`, etc — ver
 * domain/intercept.ts) em SharedPreferences — é o que o AccessibilityService
 * (Etapa 4) vai passar como `initialProps.snapshot` pro root 'Intercept' ao
 * abrir a InterceptActivity, sem esperar um round-trip ao Firestore. Chamado
 * de useDailyTasks.persistir a cada mudança em tarefas[] (seção 8 da spec
 * 09-ponte-fuga-tarefa: "sempre que tarefas mudarem"). Sem o módulo nativo,
 * não faz nada.
 */
export function salvarSnapshotDoDia(snapshot: SnapshotDia): void {
  moduloNativo()?.salvarSnapshotDoDia(JSON.stringify(snapshot));
}

/**
 * Espelha `regrasBloqueio` em SharedPreferences — mesmo racional de
 * salvarSnapshotDoDia, pro Service consultar as regras vigentes sem
 * depender do JS estar rodando.
 */
export function salvarRegrasBloqueio(regras: RegrasBloqueio): void {
  moduloNativo()?.salvarRegrasBloqueio(JSON.stringify(regras));
}

/**
 * Marca (ou atualiza) a sessão de foco em andamento pro pacote em questão —
 * ver SessaoAtivaNativa. Chamado por useFocusSession a cada início de perna
 * do timer (inicial ou "+10 min"), nunca a cada segundo.
 */
export function salvarSessaoAtiva(sessao: SessaoAtivaNativa): void {
  moduloNativo()?.salvarSessaoAtiva(JSON.stringify(sessao));
}

/**
 * Limpa a sessão ativa — chamado ao sair da fase 'contando' (parou,
 * concluiu, liberou, ou o timer chegou a zero) e no unmount.
 */
export function limparSessaoAtiva(): void {
  moduloNativo()?.limparSessaoAtiva();
}
