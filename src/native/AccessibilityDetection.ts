import { DeviceEventEmitter, NativeModules } from 'react-native';
import { EstadoTravado, RegrasBloqueio, RegrasBloqueioPendentes } from '../domain/types';
import { SnapshotDia } from '../domain/intercept';
import { ConfigBloco, EstadoSaldo } from '../domain/saldoBloqueio';

/**
 * App instalado com Launcher Intent — resolvido via `<queries>` (manifest,
 * MAIN/LAUNCHER) em vez de QUERY_ALL_PACKAGES, pra não precisar da
 * permissão "ver todos os apps" só pra montar a lista de seleção da tela de
 * bloqueio. `iconeBase64` já vem PNG pronto pra `data:image/png;base64,`.
 */
export interface AppInstalado {
  packageName: string;
  nome: string;
  iconeBase64: string;
}

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
  obterEstadoBloqueio(): Promise<string>;
  liberarBloco(): Promise<boolean>;
  liberarAcessoRapido(): Promise<string>;
  concluirEmergencia(): Promise<string>;
  abrirApp(packageName: string): Promise<boolean>;
  salvarSnapshotDoDia(snapshotJson: string): void;
  salvarRegrasBloqueio(regrasJson: string): void;
  salvarRegrasBloqueioPendentes(pendenteJson: string | null): void;
  salvarSessaoAtiva(sessaoJson: string): void;
  limparSessaoAtiva(): void;
  listarAppsInstalados(): Promise<AppInstalado[]>;
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
 * Estado do saldo diário de sessões como o nativo calculou — `agora` é o
 * relógio do aparelho no momento da leitura (a contagem regressiva do JS
 * parte dele). Mesmo formato do extra `estadoBloqueioJson` da
 * InterceptActivity (ver SaldoBloqueioPrefs.visaoParaJson). `blocosDiarios`
 * ausente/null em `config` = sem limite de sessões por dia. O fim do
 * cooldown vem em `estado.fimCooldownEm`.
 */
export interface VisaoBloqueio {
  estado: EstadoSaldo;
  config: ConfigBloco;
  agora: number;
  /** Ms de sessão que ainda restam (0 fora de SESSAO_ATIVA). */
  msRestantes?: number;
  /** true quando falta 1 minuto ou menos para o fim da sessão ativa. */
  avisoUmMinutoAtivo?: boolean;
  /** Ms até o aviso de 1 minuto (0 se já passou); ausente com o relógio parado (app fora de primeiro plano). */
  msAteAviso?: number;
  /**
   * Acesso rápido / emergência (HU-05). Todos ausentes em estado antigo =
   * cota cheia, sem liberação rápida, emergência não oferecida.
   * Ms que restam dos 2 min da liberação rápida (0 sem liberação em curso).
   */
  msRestantesLiberacaoRapida?: number;
  /** Acessos rápidos que ainda cabem hoje (cota diária menos os usos). */
  acessosRapidosRestantes?: number;
  /** Ms até o próximo acesso rápido (0 = disponível agora); ausente = cota do dia esgotada. */
  msAteProximoAcessoRapido?: number;
  /** A saída de emergência deve aparecer (RN-06). */
  emergenciaOferecida?: boolean;
}

/** Resultado de liberarAcessoRapido/concluirEmergencia: se o nativo aceitou e o estado depois da tentativa. */
export interface ResultadoLiberacaoRapida {
  aceito: boolean;
  visao: VisaoBloqueio | null;
}

function parseResultadoLiberacaoRapida(json: string | undefined | null): ResultadoLiberacaoRapida {
  if (json) {
    try {
      const parsed = JSON.parse(json) as { aceito?: unknown; visao?: unknown };
      return {
        aceito: parsed.aceito === true,
        visao: parseVisaoBloqueio(JSON.stringify(parsed.visao ?? null)),
      };
    } catch {
      // JSON malformado — cai na recusa abaixo.
    }
  }
  return { aceito: false, visao: null };
}

export function parseVisaoBloqueio(json: string | undefined | null): VisaoBloqueio | null {
  if (!json) {
    return null;
  }
  try {
    const parsed = JSON.parse(json) as Partial<VisaoBloqueio>;
    if (parsed && parsed.estado && parsed.config && typeof parsed.agora === 'number') {
      return parsed as VisaoBloqueio;
    }
  } catch {
    // JSON malformado — quem chama cai no fallback.
  }
  return null;
}

/** Lê o estado atual (já reconciliado com o relógio) do nativo. null sem o módulo nativo. */
export async function obterEstadoBloqueio(): Promise<VisaoBloqueio | null> {
  const modulo = moduloNativo();
  if (!modulo) {
    return null;
  }
  return parseVisaoBloqueio(await modulo.obterEstadoBloqueio());
}

/**
 * Fim da pausa de intenção: abre a sessão (consome 1 do saldo). Resolve false
 * se não havia nada a liberar no estado atual ou sem o módulo nativo.
 */
export async function liberarBloco(): Promise<boolean> {
  const modulo = moduloNativo();
  return modulo ? modulo.liberarBloco() : false;
}

/**
 * Fim da espera de 5 s do acesso rápido: abre 2 min de uso do app bloqueado.
 * `aceito` false = cota, intervalo ou sessão ativa impedem (ou sem o módulo
 * nativo, com `visao` null).
 */
export async function liberarAcessoRapido(): Promise<ResultadoLiberacaoRapida> {
  const modulo = moduloNativo();
  if (!modulo) {
    return { aceito: false, visao: null };
  }
  return parseResultadoLiberacaoRapida(await modulo.liberarAcessoRapido());
}

/**
 * Fim da respiração de 60 s da emergência: abre 2 min de uso sem gastar a
 * cota do acesso rápido. Mesmo formato de retorno de liberarAcessoRapido.
 */
export async function concluirEmergencia(): Promise<ResultadoLiberacaoRapida> {
  const modulo = moduloNativo();
  if (!modulo) {
    return { aceito: false, visao: null };
  }
  return parseResultadoLiberacaoRapida(await modulo.concluirEmergencia());
}

/**
 * Reabre packageName depois de liberar uma sessão (fim da pausa de intenção) — pra o usuário não precisar sair do Rootora
 * manualmente. Resolve false (nunca rejeita) se o app não puder ser reaberto (ex:
 * desinstalado nesse meio tempo) ou sem o módulo nativo — quem chama não
 * deve travar nem mostrar erro nesse caso, já que a liberação em si já
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
 * Espelha `regrasBloqueioPendentes` em SharedPreferences — `null` apaga a
 * pendência do lado nativo. É o que permite o AccessibilityService promover
 * pendente→vigente sozinho (ver BloqueioPrefs.deveInterceptar) mesmo com o
 * app fechado.
 */
export function salvarRegrasBloqueioPendentes(
  pendente: RegrasBloqueioPendentes | null,
): void {
  moduloNativo()?.salvarRegrasBloqueioPendentes(
    pendente ? JSON.stringify(pendente) : null,
  );
}

/**
 * Apps com Launcher Intent (ver AppInstalado) — pra popular a lista de
 * seleção da tela de bloqueio. Sem o módulo nativo, resolve lista vazia em
 * vez de rejeitar.
 */
export async function listarAppsInstalados(): Promise<AppInstalado[]> {
  const modulo = moduloNativo();
  if (!modulo) {
    return [];
  }
  return modulo.listarAppsInstalados();
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
