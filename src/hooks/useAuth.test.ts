import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from './useAuth';

jest.mock('../services/auth');
jest.mock('../services/firestore');

const authService = require('../services/auth');
const firestoreService = require('../services/firestore');

describe('useAuth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    authService.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb(null);
      return () => {};
    });
  });

  it('começa carregando e resolve para não autenticado', async () => {
    const { result } = await renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('reflete o usuário quando onAuthStateChanged dispara com um usuário', async () => {
    const usuarioFalso = { uid: '1', email: 'a@a.com' };
    authService.onAuthStateChanged.mockImplementation(
      (cb: (u: unknown) => void) => {
        cb(usuarioFalso);
        return () => {};
      },
    );

    const { result } = await renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.user).toEqual(usuarioFalso);
  });

  it('signUp encadeia com criarDocumentoUsuario após sucesso, passando o nome informado na tela', async () => {
    authService.signUpWithEmail.mockResolvedValueOnce({
      user: { uid: 'novo-uid' },
    });
    firestoreService.criarDocumentoUsuario.mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.signUp('a@a.com', 'senha123', 'Ana');
    });

    expect(authService.signUpWithEmail).toHaveBeenCalledWith(
      'a@a.com',
      'senha123',
    );
    expect(firestoreService.criarDocumentoUsuario).toHaveBeenCalledWith(
      'novo-uid',
      'a@a.com',
      'Ana',
    );
  });

  it('signUp mapeia o erro do Firebase para mensagem em português', async () => {
    authService.signUpWithEmail.mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    });

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(
      act(async () => {
        await result.current.signUp('a@a.com', 'senha123', 'Ana');
      }),
    ).rejects.toThrow('Esse e-mail já tem uma conta. Entrar em vez de cadastrar?');
    expect(firestoreService.criarDocumentoUsuario).not.toHaveBeenCalled();
  });

  it('signInWithGoogle encadeia com criarDocumentoUsuario e preencherNomeSeVazio, passando o displayName da conta Google', async () => {
    authService.signInWithGoogle.mockResolvedValueOnce({
      user: { uid: 'google-uid', email: 'g@a.com', displayName: 'Beto' },
    });
    firestoreService.criarDocumentoUsuario.mockResolvedValueOnce(undefined);
    firestoreService.preencherNomeSeVazio.mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(firestoreService.criarDocumentoUsuario).toHaveBeenCalledWith(
      'google-uid',
      'g@a.com',
      'Beto',
    );
    // Cobre contas Google que já existiam antes dessa mudança — o doc já
    // existe (criarDocumentoUsuario não sobrescreve), então é esse
    // segundo passo que completa o nome.
    expect(firestoreService.preencherNomeSeVazio).toHaveBeenCalledWith(
      'google-uid',
      'Beto',
    );
  });

  it('signInWithGoogle usa string vazia quando a conta Google não tem displayName', async () => {
    authService.signInWithGoogle.mockResolvedValueOnce({
      user: { uid: 'google-uid', email: 'g@a.com', displayName: null },
    });
    firestoreService.criarDocumentoUsuario.mockResolvedValueOnce(undefined);
    firestoreService.preencherNomeSeVazio.mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(firestoreService.criarDocumentoUsuario).toHaveBeenCalledWith(
      'google-uid',
      'g@a.com',
      '',
    );
    expect(firestoreService.preencherNomeSeVazio).toHaveBeenCalledWith(
      'google-uid',
      '',
    );
  });

  it('signInWithGoogle não chama criarDocumentoUsuario nem preencherNomeSeVazio em cancelamento (retorno null)', async () => {
    authService.signInWithGoogle.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(firestoreService.criarDocumentoUsuario).not.toHaveBeenCalled();
    expect(firestoreService.preencherNomeSeVazio).not.toHaveBeenCalled();
  });

  it('resetPassword não lança erro quando o e-mail não existe (não revela)', async () => {
    authService.sendPasswordReset.mockRejectedValueOnce({
      code: 'auth/user-not-found',
    });

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(
      act(async () => {
        await result.current.resetPassword('a@a.com');
      }),
    ).resolves.not.toThrow();
  });

  it('resetPassword propaga erro mapeado para falhas reais', async () => {
    authService.sendPasswordReset.mockRejectedValueOnce({
      code: 'auth/invalid-email',
    });

    const { result } = await renderHook(() => useAuth());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(
      act(async () => {
        await result.current.resetPassword('nao-e-email');
      }),
    ).rejects.toThrow('Verifique o formato do e-mail');
  });
});
