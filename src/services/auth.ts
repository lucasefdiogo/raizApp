import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged as onAuthStateChangedFirebase,
  reauthenticateWithCredential,
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

export type ProvedorConta = 'password' | 'google.com' | 'outro';

/**
 * Qual provedor a conta atual usa, pra o fluxo de reautenticação escolher
 * entre pedir a senha ou refazer o login com Google. Google tem prioridade
 * quando os dois estão vinculados.
 */
export function obterProvedorPrincipal(): ProvedorConta | null {
  const usuario = getAuth().currentUser;
  if (!usuario) {
    return null;
  }
  const provedores = usuario.providerData.map(dado => dado.providerId);
  if (provedores.includes('google.com')) {
    return 'google.com';
  }
  if (provedores.includes('password')) {
    return 'password';
  }
  return 'outro';
}

/**
 * Reautentica a conta e-mail/senha com a senha informada de novo. Lança
 * `auth/wrong-password` / `auth/invalid-credential` se a senha não bater —
 * quem trata é o hook.
 */
export async function reautenticarComSenha(senha: string): Promise<void> {
  const usuario = getAuth().currentUser;
  if (!usuario || !usuario.email) {
    throw { code: 'auth/no-current-user' };
  }
  const credential = EmailAuthProvider.credential(usuario.email, senha);
  await reauthenticateWithCredential(usuario, credential);
}

/**
 * Reautentica a conta Google refazendo o login que já existe em
 * signInWithGoogle — logar de novo na mesma conta atualiza o "login
 * recente" que o Auth exige para operações sensíveis. Lança
 * `auth/reauth-cancelada` se o usuário abandonar o fluxo do Google.
 */
export async function reautenticarComGoogle(): Promise<void> {
  const resultado = await signInWithGoogle();
  if (!resultado) {
    throw { code: 'auth/reauth-cancelada' };
  }
}

/**
 * Apaga a conta no Firebase Auth. Propaga `auth/requires-recent-login`
 * sem tratar — o hook decide qual reautenticação disparar conforme o
 * provedor da conta e repete a chamada depois.
 */
export async function excluirContaAuth(): Promise<void> {
  const usuario = getAuth().currentUser;
  if (!usuario) {
    throw { code: 'auth/no-current-user' };
  }
  await deleteUser(usuario);
}

export function onAuthStateChanged(
  callback: (usuario: User | null) => void,
): () => void {
  return onAuthStateChangedFirebase(getAuth(), callback);
}
