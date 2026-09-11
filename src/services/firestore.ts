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
} from '../domain/types';

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
}

function documentoUsuario(uid: string) {
  return doc(getFirestore(), 'users', uid);
}

/**
 * Cria users/{uid} com os campos default apenas se o documento ainda não
 * existir — idempotente para rodar sem risco em todo login, veio de
 * e-mail/senha ou Google.
 */
export async function criarDocumentoUsuario(
  uid: string,
  email: string,
): Promise<void> {
  const referencia = documentoUsuario(uid);
  const snapshot = await getDoc(referencia);
  if (snapshot.exists()) {
    return;
  }

  await setDoc(referencia, {
    email,
    nome: '',
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
  });
}

export async function buscarUsuario(
  uid: string,
): Promise<UsuarioDocumento | null> {
  const snapshot = await getDoc(documentoUsuario(uid));
  return snapshot.exists() ? (snapshot.data() as UsuarioDocumento) : null;
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
      ? usuario.dataUltimaRenovacaoEscudo.toDate().toISOString().slice(0, 10)
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

export async function buscarDailyLog(
  uid: string,
  data: string,
): Promise<DailyLog | null> {
  const referencia = doc(getFirestore(), 'users', uid, 'dailyLogs', data);
  const snapshot = await getDoc(referencia);
  return snapshot.exists() ? (snapshot.data() as DailyLog) : null;
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
    const data = new Date(hoje);
    data.setUTCDate(data.getUTCDate() - i);
    datas.push(data.toISOString().slice(0, 10));
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

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
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
  const cursor = new Date(`${inicioISO}T00:00:00Z`);
  const fim = new Date(`${fimISO}T00:00:00Z`);
  while (cursor.getTime() <= fim.getTime()) {
    datas.push(paraISO(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
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
