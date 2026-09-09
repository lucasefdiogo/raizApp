import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { FocoProcrastinacao } from '../domain/types';

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
  dataUltimaRenovacaoEscudo: unknown;
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
