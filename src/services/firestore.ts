import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
} from '@react-native-firebase/firestore';
import { DailyLog, EstadoStreak, FocoProcrastinacao } from '../domain/types';

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
  statusStreak: 'ativo' | 'em_risco' | 'perdido';
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

export async function salvarOnboardingUsuario(
  uid: string,
  dados: {
    porqueTexto: string;
    focoProcrastinacao: FocoProcrastinacao | null;
    tempoTelaEstimado: number | null;
  },
): Promise<void> {
  await setDoc(
    documentoUsuario(uid),
    {
      porqueTexto: dados.porqueTexto,
      focoProcrastinacao: dados.focoProcrastinacao,
      tempoTelaEstimado: dados.tempoTelaEstimado,
    },
    { merge: true },
  );
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
