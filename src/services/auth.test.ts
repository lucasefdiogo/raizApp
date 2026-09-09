import * as authService from './auth';

// require() em vez de import: os mocks manuais em __mocks__/ expõem helpers
// de teste (__reset, __setCurrentUser) que não existem na API real das
// libs, então tipar via import quebraria o typecheck contra os .d.ts reais.
const authMock = require('@react-native-firebase/auth');
const googleMock = require('@react-native-google-signin/google-signin');

const {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut: signOutMock,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  __setCurrentUser,
  __reset: __resetAuth,
} = authMock;

const { GoogleSignin, statusCodes, __reset: __resetGoogle } = googleMock;

describe('services/auth', () => {
  beforeEach(() => {
    __resetAuth();
    __resetGoogle();
  });

  it('signUpWithEmail chama createUserWithEmailAndPassword', async () => {
    const credentialFalso = { user: { uid: '1' } };
    createUserWithEmailAndPassword.mockResolvedValueOnce(credentialFalso);

    const resultado = await authService.signUpWithEmail(
      'a@a.com',
      'senha123',
    );

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'a@a.com',
      'senha123',
    );
    expect(resultado).toBe(credentialFalso);
  });

  it('signUpWithEmail propaga erro do Firebase', async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    });

    await expect(
      authService.signUpWithEmail('a@a.com', 'senha123'),
    ).rejects.toMatchObject({ code: 'auth/email-already-in-use' });
  });

  it('signInWithEmail chama signInWithEmailAndPassword', async () => {
    const credentialFalso = { user: { uid: '1' } };
    signInWithEmailAndPassword.mockResolvedValueOnce(credentialFalso);

    const resultado = await authService.signInWithEmail(
      'a@a.com',
      'senha123',
    );

    expect(resultado).toBe(credentialFalso);
  });

  it('signOut chama o signOut do Firebase', async () => {
    await authService.signOut();
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('sendPasswordReset chama sendPasswordResetEmail', async () => {
    await authService.sendPasswordReset('a@a.com');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'a@a.com',
    );
  });

  it('getCurrentUser reflete o usuário atual', () => {
    __setCurrentUser({ uid: '1' });
    expect(authService.getCurrentUser()).toEqual({ uid: '1' });
  });

  describe('signInWithGoogle', () => {
    it('completa o fluxo com sucesso', async () => {
      GoogleSignin.signIn.mockResolvedValueOnce({
        type: 'success',
        data: { idToken: 'token-123', user: { email: 'a@a.com' } },
      });
      const credentialFalso = { user: { uid: '1' } };
      signInWithCredential.mockResolvedValueOnce(credentialFalso);

      const resultado = await authService.signInWithGoogle();

      expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({
        showPlayServicesUpdateDialog: false,
      });
      expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('token-123');
      expect(resultado).toBe(credentialFalso);
    });

    it('retorna null quando o usuário cancela', async () => {
      GoogleSignin.signIn.mockResolvedValueOnce({ type: 'cancelled' });

      const resultado = await authService.signInWithGoogle();

      expect(resultado).toBeNull();
      expect(signInWithCredential).not.toHaveBeenCalled();
    });

    it('retorna null quando já há um login em andamento', async () => {
      GoogleSignin.signIn.mockRejectedValueOnce({
        code: statusCodes.IN_PROGRESS,
      });

      const resultado = await authService.signInWithGoogle();

      expect(resultado).toBeNull();
    });

    it('lança erro normalizado quando o Play Services está indisponível', async () => {
      GoogleSignin.hasPlayServices.mockRejectedValueOnce({
        code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
      });

      await expect(authService.signInWithGoogle()).rejects.toMatchObject({
        code: 'google/play-services-not-available',
      });
    });

    it('lança erro quando o idToken não vem na resposta', async () => {
      GoogleSignin.signIn.mockResolvedValueOnce({
        type: 'success',
        data: { idToken: null, user: { email: 'a@a.com' } },
      });

      await expect(authService.signInWithGoogle()).rejects.toMatchObject({
        code: 'google/missing-id-token',
      });
    });
  });
});
