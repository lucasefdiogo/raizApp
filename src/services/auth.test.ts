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
  reauthenticateWithCredential,
  deleteUser,
  GoogleAuthProvider,
  EmailAuthProvider,
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

  describe('obterProvedorPrincipal', () => {
    it('retorna null quando não há usuário logado', () => {
      expect(authService.obterProvedorPrincipal()).toBeNull();
    });

    it('identifica conta e-mail/senha', () => {
      __setCurrentUser({
        uid: '1',
        email: 'a@a.com',
        providerData: [{ providerId: 'password' }],
      });
      expect(authService.obterProvedorPrincipal()).toBe('password');
    });

    it('identifica conta Google, com prioridade sobre password', () => {
      __setCurrentUser({
        uid: '1',
        email: 'a@a.com',
        providerData: [{ providerId: 'password' }, { providerId: 'google.com' }],
      });
      expect(authService.obterProvedorPrincipal()).toBe('google.com');
    });
  });

  describe('reautenticarComSenha', () => {
    it('monta a credencial com o e-mail atual e reautentica', async () => {
      __setCurrentUser({ uid: '1', email: 'a@a.com', providerData: [] });

      await authService.reautenticarComSenha('senha123');

      expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
        'a@a.com',
        'senha123',
      );
      expect(reauthenticateWithCredential).toHaveBeenCalledTimes(1);
    });

    it('lança auth/no-current-user quando não há usuário', async () => {
      await expect(
        authService.reautenticarComSenha('x'),
      ).rejects.toMatchObject({ code: 'auth/no-current-user' });
    });

    it('propaga auth/wrong-password vindo do Firebase', async () => {
      __setCurrentUser({ uid: '1', email: 'a@a.com', providerData: [] });
      reauthenticateWithCredential.mockRejectedValueOnce({
        code: 'auth/wrong-password',
      });

      await expect(
        authService.reautenticarComSenha('errada'),
      ).rejects.toMatchObject({ code: 'auth/wrong-password' });
    });
  });

  describe('reautenticarComGoogle', () => {
    it('conclui quando o login Google retorna credencial', async () => {
      GoogleSignin.signIn.mockResolvedValueOnce({
        type: 'success',
        data: { idToken: 'token-123', user: { email: 'a@a.com' } },
      });
      signInWithCredential.mockResolvedValueOnce({ user: { uid: '1' } });

      await expect(
        authService.reautenticarComGoogle(),
      ).resolves.toBeUndefined();
    });

    it('lança auth/reauth-cancelada quando o usuário abandona o fluxo', async () => {
      GoogleSignin.signIn.mockResolvedValueOnce({ type: 'cancelled' });

      await expect(
        authService.reautenticarComGoogle(),
      ).rejects.toMatchObject({ code: 'auth/reauth-cancelada' });
    });
  });

  describe('excluirContaAuth', () => {
    it('chama deleteUser com o usuário atual', async () => {
      __setCurrentUser({ uid: '1', email: 'a@a.com', providerData: [] });

      await authService.excluirContaAuth();

      expect(deleteUser).toHaveBeenCalledTimes(1);
    });

    it('lança auth/no-current-user quando não há usuário', async () => {
      await expect(authService.excluirContaAuth()).rejects.toMatchObject({
        code: 'auth/no-current-user',
      });
    });

    it('propaga auth/requires-recent-login sem tratar', async () => {
      __setCurrentUser({ uid: '1', email: 'a@a.com', providerData: [] });
      deleteUser.mockRejectedValueOnce({ code: 'auth/requires-recent-login' });

      await expect(authService.excluirContaAuth()).rejects.toMatchObject({
        code: 'auth/requires-recent-login',
      });
    });
  });
});
