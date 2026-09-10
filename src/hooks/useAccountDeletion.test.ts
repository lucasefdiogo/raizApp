import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAccountDeletion } from './useAccountDeletion';

jest.mock('../services/auth');
jest.mock('../services/firestore');
jest.mock('../services/notifications');
jest.mock('./useToast');

const authService = require('../services/auth');
const firestoreService = require('../services/firestore');
const notificationsService = require('../services/notifications');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const MSG_FALHA_LIMPEZA =
  'Não foi possível concluir a exclusão agora. Tente de novo.';
const MSG_FALHA_ENCERRAR_ACESSO =
  'Seus dados foram removidos, mas o acesso não foi encerrado agora. Saia e entre de novo para concluir.';
const MSG_SEM_USUARIO = 'Sua sessão expirou. Entre de novo para excluir a conta.';
const MSG_SENHA_INCORRETA = 'Senha incorreta. Tente de novo.';

describe('useAccountDeletion', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useToast.mockReturnValue({ showToast });
    authService.getCurrentUser.mockReturnValue({ uid: 'uid-1' });
    authService.obterProvedorPrincipal.mockReturnValue('password');
    firestoreService.apagarTodosOsDadosDoUsuario.mockResolvedValue(undefined);
    notificationsService.cancelarTodasNotificacoes.mockResolvedValue(undefined);
    authService.excluirContaAuth.mockResolvedValue(undefined);
    authService.reautenticarComSenha.mockResolvedValue(undefined);
    authService.reautenticarComGoogle.mockResolvedValue(undefined);
  });

  it('fluxo feliz: apaga dados, cancela notificações e apaga a conta — na ordem, sem toast', async () => {
    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    expect(firestoreService.apagarTodosOsDadosDoUsuario).toHaveBeenCalledWith(
      'uid-1',
    );
    expect(notificationsService.cancelarTodasNotificacoes).toHaveBeenCalledTimes(
      1,
    );
    expect(authService.excluirContaAuth).toHaveBeenCalledTimes(1);

    const ordemLimpeza =
      firestoreService.apagarTodosOsDadosDoUsuario.mock.invocationCallOrder[0];
    const ordemNotificacoes =
      notificationsService.cancelarTodasNotificacoes.mock
        .invocationCallOrder[0];
    const ordemAuth = authService.excluirContaAuth.mock.invocationCallOrder[0];
    expect(ordemLimpeza).toBeLessThan(ordemNotificacoes);
    expect(ordemNotificacoes).toBeLessThan(ordemAuth);

    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.precisaReautenticar).toBe(false);
    expect(result.current.erro).toBeNull();
  });

  it('sem usuário logado: dispara toast e não apaga nada', async () => {
    authService.getCurrentUser.mockReturnValue(null);
    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    expect(showToast).toHaveBeenCalledWith(MSG_SEM_USUARIO);
    expect(firestoreService.apagarTodosOsDadosDoUsuario).not.toHaveBeenCalled();
    expect(authService.excluirContaAuth).not.toHaveBeenCalled();
  });

  it('falha de rede nos passos 1–4: toast e NÃO chega no passo 5', async () => {
    firestoreService.apagarTodosOsDadosDoUsuario.mockRejectedValueOnce(
      new Error('offline'),
    );
    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_LIMPEZA);
    expect(authService.excluirContaAuth).not.toHaveBeenCalled();
    expect(result.current.carregando).toBe(false);
    expect(result.current.precisaReautenticar).toBe(false);
  });

  it('falha de rede no passo 5 (não requires-recent-login): toast do cenário de borda', async () => {
    authService.excluirContaAuth.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    expect(firestoreService.apagarTodosOsDadosDoUsuario).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_ENCERRAR_ACESSO);
    expect(result.current.carregando).toBe(false);
    expect(result.current.precisaReautenticar).toBe(false);
  });

  it('requires-recent-login (senha): pausa, reautentica com a senha e conclui', async () => {
    authService.excluirContaAuth
      .mockRejectedValueOnce({ code: 'auth/requires-recent-login' })
      .mockResolvedValueOnce(undefined);
    authService.obterProvedorPrincipal.mockReturnValue('password');

    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    expect(result.current.precisaReautenticar).toBe(true);
    expect(result.current.provedor).toBe('password');
    expect(result.current.carregando).toBe(false);
    expect(firestoreService.apagarTodosOsDadosDoUsuario).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.reautenticar('minhaSenha');
    });

    expect(authService.reautenticarComSenha).toHaveBeenCalledWith('minhaSenha');
    expect(authService.reautenticarComGoogle).not.toHaveBeenCalled();
    expect(authService.excluirContaAuth).toHaveBeenCalledTimes(2);
    // não refez a limpeza dos passos 1–4
    expect(firestoreService.apagarTodosOsDadosDoUsuario).toHaveBeenCalledTimes(1);
    expect(result.current.precisaReautenticar).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('requires-recent-login (Google): reautentica sem senha refazendo o login Google', async () => {
    authService.excluirContaAuth
      .mockRejectedValueOnce({ code: 'auth/requires-recent-login' })
      .mockResolvedValueOnce(undefined);
    authService.obterProvedorPrincipal.mockReturnValue('google.com');

    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    expect(result.current.provedor).toBe('google.com');

    await act(async () => {
      await result.current.reautenticar();
    });

    expect(authService.reautenticarComGoogle).toHaveBeenCalledTimes(1);
    expect(authService.reautenticarComSenha).not.toHaveBeenCalled();
    expect(authService.excluirContaAuth).toHaveBeenCalledTimes(2);
    expect(result.current.precisaReautenticar).toBe(false);
  });

  it('senha errada na reautenticação: mostra erro e não repete a exclusão', async () => {
    authService.excluirContaAuth.mockRejectedValueOnce({
      code: 'auth/requires-recent-login',
    });
    authService.reautenticarComSenha.mockRejectedValueOnce({
      code: 'auth/wrong-password',
    });

    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });
    await act(async () => {
      await result.current.reautenticar('errada');
    });

    await waitFor(() =>
      expect(result.current.erro).toBe(MSG_SENHA_INCORRETA),
    );
    expect(result.current.precisaReautenticar).toBe(true);
    expect(authService.excluirContaAuth).toHaveBeenCalledTimes(1);
  });

  it('cancelar a reautenticação limpa o estado sem concluir a exclusão', async () => {
    authService.excluirContaAuth.mockRejectedValueOnce({
      code: 'auth/requires-recent-login',
    });
    const { result } = await renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.excluirConta();
    });

    await act(async () => {
      result.current.cancelarReautenticacao();
    });

    expect(result.current.precisaReautenticar).toBe(false);
    expect(result.current.provedor).toBeNull();
    expect(result.current.erro).toBeNull();
    expect(authService.excluirContaAuth).toHaveBeenCalledTimes(1);
  });
});
