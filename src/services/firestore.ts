import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from '@react-native-firebase/firestore';
import {
  BloqueioAppsConfig,
  DailyLog,
  Desafio,
  EstadoStreak,
  FocoProcrastinacao,
  StatusDesafio,
  StatusStreak,
  Tarefa,
  TipoTarefa,
} from '../domain/types';
import { dataLocalDeISO, paraISOLocal } from '../domain/data';

export interface UsuarioDocumento {
  email: string;
  nome: string;
  createdAt: unknown;
  porqueTexto: string | null;
  focoProcrastinacao: FocoProcrastinacao | null;
  tempoTelaEstimado: number | null;
  streakAtual: number;
  diasTotaisAtivos: number;
  escudosDisponiveis: number;
  dataUltimaRenovacaoEscudo: Timestamp | null;
  ultimoDiaAtivo: string | null;
  statusStreak: StatusStreak;
  marcosAtingidos: number[];
  notificacoesAtivas: boolean;
  horarioLembreteDiario: string | null;
  /** Ausente = usuário nunca configurou (ver BloqueioAppsConfig). */
  bloqueioApps?: BloqueioAppsConfig;
  /**
   * Gate real de conclusão do onboarding (ver RootNavigator, via
   * useOnboardingStatus) — não `porqueTexto`. Só vira true ao final do
   * passo de primeira tarefa (Começar ou Pular por hoje), depois de
   * foco/tempoTela/porquê já persistidos.
   */
  onboardingConcluido: boolean;
}

function documentoUsuario(uid: string) {
  return doc(getFirestore(), 'users', uid);
}

/**
 * Cria users/{uid} com os campos default apenas se o documento ainda não
 * existir — idempotente para rodar sem risco em todo login, veio de
 * e-mail/senha ou Google. `nome` vem de fontes diferentes conforme o
 * provedor (useAuth decide): cadastro por e-mail pede o nome na tela;
 * Google usa o displayName da própria conta. Default '' preserva o
 * comportamento pra quem já tinha conta antes dessa mudança.
 */
export async function criarDocumentoUsuario(
  uid: string,
  email: string,
  nome: string = '',
): Promise<void> {
  const referencia = documentoUsuario(uid);
  const snapshot = await getDoc(referencia);
  if (snapshot.exists()) {
    return;
  }

  await setDoc(referencia, {
    email,
    nome,
    createdAt: serverTimestamp(),
    porqueTexto: null,
    focoProcrastinacao: null,
    tempoTelaEstimado: null,
    streakAtual: 0,
    diasTotaisAtivos: 0,
    escudosDisponiveis: 1,
    dataUltimaRenovacaoEscudo: serverTimestamp(),
    ultimoDiaAtivo: null,
    statusStreak: 'ativo',
    marcosAtingidos: [],
    notificacoesAtivas: true,
    horarioLembreteDiario: null,
    onboardingConcluido: false,
  });
}

export async function buscarUsuario(
  uid: string,
): Promise<UsuarioDocumento | null> {
  const snapshot = await getDoc(documentoUsuario(uid));
  return snapshot.exists() ? (snapshot.data() as UsuarioDocumento) : null;
}

/**
 * Completa users/{uid}.nome só se ele estiver vazio hoje — pra contas
 * Google que já existiam antes de criarDocumentoUsuario passar a gravar o
 * displayName (esse já não roda de novo pra doc existente). Chamado a
 * cada login Google (useAuth), não só no cadastro; nunca sobrescreve um
 * nome que o usuário já tenha (gravado por qualquer via).
 */
export async function preencherNomeSeVazio(
  uid: string,
  nome: string,
): Promise<void> {
  if (!nome) {
    return;
  }
  const usuario = await buscarUsuario(uid);
  if (usuario && !usuario.nome) {
    await setDoc(documentoUsuario(uid), { nome }, { merge: true });
  }
}

/**
 * Grava campos do onboarding em users/{uid} com merge — cada passo do
 * wizard chama isso com só o campo que acabou de ser respondido, pra o
 * progresso não se perder se o app fechar no meio do fluxo.
 */
export async function atualizarDadosOnboarding(
  uid: string,
  campos: Partial<{
    porqueTexto: string;
    focoProcrastinacao: FocoProcrastinacao;
    tempoTelaEstimado: number;
  }>,
): Promise<void> {
  await setDoc(documentoUsuario(uid), campos, { merge: true });
}

/**
 * Marca o onboarding como concluído de fato — gate real usado por
 * useOnboardingStatus (RootNavigator). Chamado só ao final do passo de
 * primeira tarefa, seja criando a tarefa ou pulando (as duas opções são
 * válidas, nenhuma delas é um impedimento).
 */
export async function marcarOnboardingConcluido(uid: string): Promise<void> {
  await setDoc(documentoUsuario(uid), { onboardingConcluido: true }, { merge: true });
}

/**
 * Lê os campos de streak de users/{uid} e converte para o formato que
 * domain/streak.ts consome (datas como string ISO, não Timestamp).
 */
export async function buscarEstadoStreak(
  uid: string,
): Promise<EstadoStreak | null> {
  const usuario = await buscarUsuario(uid);
  if (!usuario) {
    return null;
  }

  return {
    streakAtual: usuario.streakAtual,
    diasTotaisAtivos: usuario.diasTotaisAtivos,
    escudosDisponiveis: usuario.escudosDisponiveis,
    marcosAtingidos: usuario.marcosAtingidos,
    ultimoDiaAtivo: usuario.ultimoDiaAtivo ?? '',
    statusStreak: usuario.statusStreak,
    dataUltimaRenovacaoEscudo: usuario.dataUltimaRenovacaoEscudo
      ? paraISOLocal(usuario.dataUltimaRenovacaoEscudo.toDate())
      : '',
  };
}

export async function atualizarEstadoStreak(
  uid: string,
  novoEstado: EstadoStreak,
): Promise<void> {
  await setDoc(
    documentoUsuario(uid),
    {
      streakAtual: novoEstado.streakAtual,
      diasTotaisAtivos: novoEstado.diasTotaisAtivos,
      escudosDisponiveis: novoEstado.escudosDisponiveis,
      marcosAtingidos: novoEstado.marcosAtingidos,
      ultimoDiaAtivo: novoEstado.ultimoDiaAtivo,
      statusStreak: novoEstado.statusStreak,
      dataUltimaRenovacaoEscudo: Timestamp.fromDate(
        new Date(`${novoEstado.dataUltimaRenovacaoEscudo}T00:00:00Z`),
      ),
    },
    { merge: true },
  );
}

/**
 * `tarefas`/`statusDia`/`escudoUsado` podem estar ausentes num documento
 * que EXISTE: `incrementarDesbloqueiosHoje` grava `dailyLogs/{data}` com
 * `setDoc({ desbloqueiosApps }, { merge: true })`, que cria o documento na
 * primeira vez sem nenhum desses três campos (ex: usuário desbloqueia um
 * app bloqueado antes de mexer em qualquer tarefa no dia). Sem normalizar
 * aqui, todo consumidor de buscarDailyLog (useDailyTasks em primeiro
 * lugar) recebia `tarefas: undefined` e quebrava em
 * `calcularStatusDia(tarefas)` → `tarefas.length` (crash real visto em
 * device físico ao reabrir um app já desbloqueado por respiração).
 */
export async function buscarDailyLog(
  uid: string,
  data: string,
): Promise<DailyLog | null> {
  const referencia = doc(getFirestore(), 'users', uid, 'dailyLogs', data);
  const snapshot = await getDoc(referencia);
  if (!snapshot.exists()) {
    return null;
  }

  const bruto = snapshot.data() as Partial<DailyLog>;
  return {
    data,
    tarefas: bruto.tarefas ?? [],
    statusDia: bruto.statusDia ?? 'pendente',
    escudoUsado: bruto.escudoUsado ?? false,
    ...(bruto.desbloqueiosApps !== undefined
      ? { desbloqueiosApps: bruto.desbloqueiosApps }
      : {}),
  };
}

/**
 * Diz se o usuário já tem algum dailyLog gravado (qualquer data). Usado
 * pela Home pra decidir se semeia as tarefas de exemplo: só no primeiro
 * dia de uso: uma vez que exista qualquer dailyLog, dias novos começam
 * vazios pro usuário montar a própria lista.
 */
export async function existeAlgumDailyLog(uid: string): Promise<boolean> {
  const colecao = collection(getFirestore(), 'users', uid, 'dailyLogs');
  const snapshot = await getDocs(query(colecao, limit(1)));
  return !snapshot.empty;
}

/**
 * Busca os dailyLogs dos últimos `quantidadeDias` dias (incluindo hoje).
 * Datas sem documento correspondente simplesmente não aparecem no array —
 * quem monta o histórico visual (domain/progress.ts) decide o que fazer com
 * a ausência.
 */
export async function buscarUltimosDailyLogs(
  uid: string,
  quantidadeDias: number,
): Promise<DailyLog[]> {
  const hoje = new Date();
  const datas: string[] = [];
  for (let i = quantidadeDias - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    datas.push(paraISOLocal(data));
  }

  const logs = await Promise.all(datas.map(data => buscarDailyLog(uid, data)));
  return logs.filter((log): log is DailyLog => log !== null);
}

export interface SystemMessage {
  titulo: string;
  corpo: string;
}

export async function buscarSystemMessage(
  key: string,
): Promise<SystemMessage | null> {
  const referencia = doc(getFirestore(), 'systemMessages', key);
  const snapshot = await getDoc(referencia);
  return snapshot.exists() ? (snapshot.data() as SystemMessage) : null;
}

/**
 * Grava dailyLogs/{data} por inteiro, criando o documento se ainda não
 * existir. Sobrescreve o que já estava lá — quem chama é responsável por
 * montar o objeto completo (ver buscarDailyLog para ler o estado atual
 * antes de decidir o que muda).
 */
export async function salvarDailyLog(
  uid: string,
  data: string,
  log: DailyLog,
): Promise<void> {
  const referencia = doc(getFirestore(), 'users', uid, 'dailyLogs', data);
  await setDoc(referencia, log);
}

/**
 * Garante que dailyLogs/{data} existe, criando com `tarefasIniciais` (já
 * pré-populadas a partir de essentialTasks — ver useDailyTasks.carregar())
 * se ainda não existir. Idempotente por leitura antes de escrever: nunca
 * sobrescreve um documento que já tem progresso real do dia, só preenche a
 * lacuna de um dia aberto mas nunca tocado — sem isso, esse dia não gera
 * dailyLog nenhum e aparece como `sem_registro` no histórico/desafios em vez
 * de `perdido` quando as tarefas continuam sem conclusão (ver domain/progress.ts).
 */
export async function garantirDailyLogDoDia(
  uid: string,
  data: string,
  tarefasIniciais: Tarefa[],
): Promise<void> {
  const referencia = doc(getFirestore(), 'users', uid, 'dailyLogs', data);
  const snapshot = await getDoc(referencia);
  if (snapshot.exists()) {
    return;
  }

  await setDoc(referencia, {
    data,
    tarefas: tarefasIniciais,
    statusDia: 'pendente',
    escudoUsado: false,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}

/**
 * Acrescenta uma tarefa a dailyLogs/{data}, criando o documento se ainda não
 * existir. Usado pela tela de retorno após pausa para registrar a tarefa
 * pequena que o usuário escolhe pra recomeçar o dia.
 */
export async function adicionarTarefaAoDailyLog(
  uid: string,
  data: string,
  tarefa: Tarefa,
): Promise<void> {
  const logAtual = await buscarDailyLog(uid, data);

  await salvarDailyLog(uid, data, {
    data,
    tarefas: [...(logAtual?.tarefas ?? []), tarefa],
    statusDia: logAtual?.statusDia ?? 'pendente',
    escudoUsado: logAtual?.escudoUsado ?? false,
  });
}

/**
 * Remove uma entrada específica de tarefas[] de dailyLogs/{data}. Não-op se
 * o dailyLog não existir ou o id não estiver na lista. Sobrescreve o
 * documento por inteiro (mesmo padrão de salvarDailyLog) — não é o caminho
 * usado por useDailyTasks (que já mantém o próprio estado otimista local
 * e chama salvarDailyLog direto); existe como primitiva de baixo nível
 * pra remover uma tarefa de um dia sem precisar ler+recompor o array na
 * mão em quem chama.
 */
export async function removerTarefaDoDia(
  uid: string,
  data: string,
  tarefaId: string,
): Promise<void> {
  const logAtual = await buscarDailyLog(uid, data);
  if (!logAtual) {
    return;
  }

  await salvarDailyLog(uid, data, {
    ...logAtual,
    tarefas: logAtual.tarefas.filter(tarefa => tarefa.id !== tarefaId),
  });
}

export interface TarefaRecorrente {
  id: string;
  titulo: string;
  essencial: boolean;
  ativa: boolean;
  criadaEm: unknown;
  /** Ausente = tarefa comum (mesmo shape de Tarefa, sem tipo/duracaoMinutos). */
  tipo?: TipoTarefa;
  duracaoMinutos?: number;
}

function documentoTarefaRecorrente(uid: string, taskId: string) {
  return doc(getFirestore(), 'users', uid, 'essentialTasks', taskId);
}

// Gerado no client (não via auto-ID do Firestore) — mais simples de
// testar com o mock do projeto, que não simula collection().doc() sem
// segmentos. Só precisa ser único dentro da subcoleção de um usuário.
function gerarIdTarefaRecorrente(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Cria uma tarefa recorrente em users/{uid}/essentialTasks (coleção
 * prevista desde o schema original, nunca usada até agora — ver
 * regras de segurança já publicadas). Retorna o ID gerado, que quem
 * chama usa como origemRecorrenteId da tarefa de hoje.
 */
export async function criarTarefaRecorrente(
  uid: string,
  titulo: string,
  essencial: boolean,
  tipo?: TipoTarefa,
  duracaoMinutos?: number,
): Promise<string> {
  const id = gerarIdTarefaRecorrente();
  const dados: Omit<TarefaRecorrente, 'id'> = {
    titulo,
    essencial,
    ativa: true,
    criadaEm: serverTimestamp(),
  };
  // Só grava os campos de exercício quando são de fato exercício — mesmo
  // racional de adicionarTarefa em useDailyTasks.ts.
  if (tipo === 'exercicio') {
    dados.tipo = tipo;
    if (duracaoMinutos !== undefined) {
      dados.duracaoMinutos = duracaoMinutos;
    }
  }
  await setDoc(documentoTarefaRecorrente(uid, id), dados);
  return id;
}

/**
 * Tarefas recorrentes ainda ativas — usada tanto pra pré-popular um
 * dailyLog novo quanto por qualquer tela de gerenciamento futura. Filtra
 * `ativa` no client (mesmo padrão de buscarDesafiosAtivos), sem `where`,
 * pra não exigir índice — volume mínimo por usuário.
 */
export async function buscarTarefasRecorrentesAtivas(
  uid: string,
): Promise<TarefaRecorrente[]> {
  const snapshot = await getDocs(
    collection(getFirestore(), 'users', uid, 'essentialTasks'),
  );
  return snapshot.docs
    .map(documento => ({
      id: documento.id,
      ...(documento.data() as Omit<TarefaRecorrente, 'id'>),
    }))
    .filter(tarefa => tarefa.ativa);
}

/**
 * "Parar de repetir" — só marca ativa: false. Não mexe em nenhum
 * dailyLog: a entrada de hoje (se existir) permanece como está, e dias
 * anteriores já registrados não são afetados. Deixa de ser criada nos
 * dias seguintes porque buscarTarefasRecorrentesAtivas não a lista mais.
 */
export async function desativarTarefaRecorrente(
  uid: string,
  taskId: string,
): Promise<void> {
  await setDoc(
    documentoTarefaRecorrente(uid, taskId),
    { ativa: false },
    { merge: true },
  );
}

/**
 * Quantos desbloqueios de apps bloqueados já aconteceram hoje (ver
 * domain/appBlockEscalation.ts). Ausente no dailyLog = 0 — ainda nenhum.
 */
export async function buscarDesbloqueiosHojeDoApp(
  uid: string,
  data: string,
): Promise<number> {
  const log = await buscarDailyLog(uid, data);
  return log?.desbloqueiosApps ?? 0;
}

/**
 * Incrementa desbloqueiosApps em dailyLogs/{data} em +1, criando o documento
 * se ainda não existir. Usa o incremento atômico do Firestore (increment),
 * não ler-modificar-escrever manualmente — evita perder incrementos se o
 * usuário desbloquear rápido em sequência (race condition).
 */
export async function incrementarDesbloqueiosHoje(
  uid: string,
  data: string,
): Promise<void> {
  const referencia = doc(getFirestore(), 'users', uid, 'dailyLogs', data);
  await setDoc(referencia, { desbloqueiosApps: increment(1) }, { merge: true });
}

export async function atualizarStatusStreak(
  uid: string,
  statusStreak: StatusStreak,
): Promise<void> {
  await setDoc(documentoUsuario(uid), { statusStreak }, { merge: true });
}

export async function atualizarPerfilUsuario(
  uid: string,
  campos: Partial<{
    porqueTexto: string;
    notificacoesAtivas: boolean;
    horarioLembreteDiario: string;
  }>,
): Promise<void> {
  await setDoc(documentoUsuario(uid), campos, { merge: true });
}

/**
 * Atualiza bloqueioApps em users/{uid}. Quem chama deve passar o objeto
 * COMPLETO (não só o campo que mudou) — o merge do Firestore é recursivo em
 * mapas aninhados no dispositivo real, mas o mock usado nos testes faz merge
 * raso; mandar sempre o objeto inteiro funciona nos dois casos (é o que
 * useAppBlockConfig faz).
 */
export async function atualizarConfigBloqueioApps(
  uid: string,
  config: Partial<BloqueioAppsConfig>,
): Promise<void> {
  await setDoc(documentoUsuario(uid), { bloqueioApps: config }, { merge: true });
}

// Firestore aceita até 500 operações por batch. Ficamos abaixo pra ter
// margem e paginamos a leitura — não dá pra assumir que a subcoleção é
// pequena.
const TAMANHO_PAGINA_EXCLUSAO = 400;

const SUBCOLECOES_DO_USUARIO = ['dailyLogs', 'essentialTasks'] as const;

/**
 * Apaga todos os documentos de uma subcoleção de users/{uid}, em páginas.
 * Cada volta relê do começo (getDocs sem cursor) e apaga o que leu, então o
 * loop drena a coleção naturalmente. Subcoleção inexistente sai na primeira
 * volta (página vazia).
 */
async function apagarSubcolecaoDoUsuario(
  uid: string,
  nomeSubcolecao: string,
): Promise<void> {
  const bd = getFirestore();
  const referenciaColecao = collection(bd, 'users', uid, nomeSubcolecao);

  for (;;) {
    const pagina = await getDocs(
      query(referenciaColecao, limit(TAMANHO_PAGINA_EXCLUSAO)),
    );
    if (pagina.empty) {
      return;
    }

    const lote = writeBatch(bd);
    pagina.forEach(documento => {
      lote.delete(doc(bd, 'users', uid, nomeSubcolecao, documento.id));
    });
    await lote.commit();

    if (pagina.size < TAMANHO_PAGINA_EXCLUSAO) {
      return;
    }
  }
}

/**
 * Apaga TODOS os dados do usuário no Firestore, na ordem: subcoleções
 * primeiro (dailyLogs, essentialTasks), depois o documento users/{uid}.
 * Feito client-side (dívida técnica registrada no CLAUDE.md) — exige que o
 * Auth do usuário ainda esteja válido, então deve rodar ANTES de apagar a
 * conta no Firebase Auth.
 */
export async function apagarTodosOsDadosDoUsuario(uid: string): Promise<void> {
  for (const nomeSubcolecao of SUBCOLECOES_DO_USUARIO) {
    await apagarSubcolecaoDoUsuario(uid, nomeSubcolecao);
  }
  await deleteDoc(documentoUsuario(uid));
}

/**
 * Busca os dailyLogs entre `inicioISO` e `fimISO` (inclusivos). Datas sem
 * documento simplesmente não aparecem — quem consome decide o que fazer com
 * a ausência. Mesmo padrão de N `getDoc` de buscarUltimosDailyLogs; o
 * intervalo maior aqui é o mês (~31 leituras), aceitável no MVP.
 */
export async function buscarDailyLogsNoIntervalo(
  uid: string,
  inicioISO: string,
  fimISO: string,
): Promise<DailyLog[]> {
  const datas: string[] = [];
  const cursor = dataLocalDeISO(inicioISO);
  const fim = dataLocalDeISO(fimISO);
  while (cursor.getTime() <= fim.getTime()) {
    datas.push(paraISOLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const logs = await Promise.all(datas.map(data => buscarDailyLog(uid, data)));
  return logs.filter((log): log is DailyLog => log !== null);
}

function documentoDesafio(uid: string, challengeId: string) {
  return doc(getFirestore(), 'users', uid, 'challenges', challengeId);
}

/**
 * Todos os desafios com status 'ativo'. Filtra no client (volume mínimo: 1
 * semanal + 1 mensal ativos por vez), sem `where`, pra não exigir índice.
 */
export async function buscarDesafiosAtivos(uid: string): Promise<Desafio[]> {
  const snapshot = await getDocs(
    collection(getFirestore(), 'users', uid, 'challenges'),
  );
  return snapshot.docs
    .map(documento => documento.data() as Desafio)
    .filter(desafio => desafio.status === 'ativo');
}

export async function criarDesafio(
  uid: string,
  desafio: Desafio,
): Promise<void> {
  await setDoc(documentoDesafio(uid, desafio.id), desafio);
}

export async function atualizarProgressoDesafio(
  uid: string,
  challengeId: string,
  progresso: number,
  status: StatusDesafio,
): Promise<void> {
  await setDoc(
    documentoDesafio(uid, challengeId),
    { progresso, status },
    { merge: true },
  );
}
