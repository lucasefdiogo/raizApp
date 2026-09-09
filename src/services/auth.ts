import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged as onAuthStateChangedFirebase,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as signOutFirebase,
  type User,
  type UserCredential,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export async function signUpWithEmail(
  email: string,
  senha: string,
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(getAuth(), email, senha);
}

export async function signInWithEmail(
  email: string,
  senha: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getAuth(), email, senha);
}

/**
 * Cancelamento do usuário e uma nova tentativa enquanto outra já está em
 * andamento não são erros — resolvem com `null` ("nenhuma ação").
 */
export async function signInWithGoogle(): Promise<UserCredential | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
  } catch (erro) {
    if (isErrorWithCode(erro) && erro.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw { code: 'google/play-services-not-available' };
    }
    throw erro;
  }

  let resposta;
  try {
    resposta = await GoogleSignin.signIn();
  } catch (erro) {
    if (isErrorWithCode(erro) && erro.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    throw erro;
  }

  if (resposta.type === 'cancelled') {
    return null;
  }

  const idToken = resposta.data.idToken;
  if (!idToken) {
    throw { code: 'google/missing-id-token' };
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(getAuth(), credential);
}

export async function signOut(): Promise<void> {
  await signOutFirebase(getAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuth(), email);
}

export function getCurrentUser(): User | null {
  return getAuth().currentUser;
}

export function onAuthStateChanged(
  callback: (usuario: User | null) => void,
): () => void {
  return onAuthStateChangedFirebase(getAuth(), callback);
}
