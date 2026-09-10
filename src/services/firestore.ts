import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from '@react-native-firebase/firestore';
import {
  DailyLog,
  EstadoStreak,
  FocoProcrastinacao,
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
