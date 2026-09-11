import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { useAppBlocking } from './useAppBlocking';

jest.mock('../native/AccessibilityDetection', () => {
  const actual = jest.requireActual('../native/AccessibilityDetection');
  return {
    ...actual,
    getInitialBlockedPackage: jest.fn(),
    getInstalledApps: jest.fn(),
    registrarDesbloqueioTemporario: jest.fn(),
  };
});

const nativo = require('../native/AccessibilityDetection');

/**
 * O listener de blocked-app-detected (resolverEExibir) é assíncrono —
 * espera getInstalledApps() antes de atualizar o estado. `emit` chama o
 * listener de forma síncrona, mas o setState só acontece depois desse
 * await, fora do act() se ele não for assíncrono. Envolve o emit num act
 * async com uma volta de microtarefa pra o setState entrar sob o mesmo
 * act — sem isso o React descarta a atualização no ambiente de teste.
 */
async function emitirBloqueado(packageName: string) {
  await act(async () => {
    DeviceEventEmitter.emit('blocked-app-detected', { packageName });
    await new Promise<void>(resolve => setTimeout(() => resolve(), 0));
  });
}

const APPS_MOCK = [
  {
    packageName: 'com.instagram.android',
    nome: 'Instagram',
    icone: 'data:image/png;base64,QQ==',
  },
  { packageName: 'com.whatsapp', nome: 'WhatsApp', icone: null },
];

describe('useAppBlocking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nativo.getInitialBlockedPackage.mockResolvedValue(null);
    nativo.getInstalledApps.mockResolvedValue(APPS_MOCK);
  });

  it('começa sem app bloqueado quando não há intent pendente', async () => {
    const { result } = await renderHook(() => useAppBlocking());

    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());
    expect(result.current.appBloqueadoAtual).toBeNull();
    expect(nativo.getInstalledApps).not.toHaveBeenCalled();
  });

  it('resolve o app pendente do cold start (getInitialBlockedPackage) com nome e ícone', async () => {
    nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
    const { result } = await renderHook(() => useAppBlocking());

    await waitFor(() =>
      expect(result.current.appBloqueadoAtual).toEqual({
        packageName: 'com.instagram.android',
        nome: 'Instagram',
        icone: 'data:image/png;base64,QQ==',
      }),
    );
  });

  it('atualiza appBloqueadoAtual quando o evento blocked-app-detected dispara', async () => {
    const { result } = await renderHook(() => useAppBlocking());
    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());

    await emitirBloqueado('com.whatsapp');

    expect(result.current.appBloqueadoAtual).toEqual({
      packageName: 'com.whatsapp',
      nome: 'WhatsApp',
      icone: null,
    });
  });

  it('usa o próprio packageName como nome quando não encontra na lista de apps', async () => {
    const { result } = await renderHook(() => useAppBlocking());
    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());

    await emitirBloqueado('com.desconhecido');

    expect(result.current.appBloqueadoAtual).toEqual({
      packageName: 'com.desconhecido',
      nome: 'com.desconhecido',
      icone: null,
    });
  });

  it('só chama getInstalledApps uma vez pra dois bloqueios seguidos (cacheado)', async () => {
    const { result } = await renderHook(() => useAppBlocking());
    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());

    await emitirBloqueado('com.instagram.android');
    await emitirBloqueado('com.whatsapp');

    expect(result.current.appBloqueadoAtual?.packageName).toBe('com.whatsapp');
    expect(nativo.getInstalledApps).toHaveBeenCalledTimes(1);
  });

  describe('desbloquear', () => {
    it('registra o desbloqueio temporário pro packageName atual, sem fechar a tela', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking());
      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());

      await act(async () => {
        result.current.desbloquear(15);
      });

      expect(nativo.registrarDesbloqueioTemporario).toHaveBeenCalledWith(
        'com.instagram.android',
        15,
      );
      expect(result.current.appBloqueadoAtual).not.toBeNull();
    });

    it('não faz nada sem app bloqueado atual', async () => {
      const { result } = await renderHook(() => useAppBlocking());

      await act(async () => {
        result.current.desbloquear(15);
      });

      expect(nativo.registrarDesbloqueioTemporario).not.toHaveBeenCalled();
    });
  });

  describe('dispensar', () => {
    it('limpa appBloqueadoAtual sem registrar desbloqueio', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking());
      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());

      await act(async () => {
        result.current.dispensar();
      });

      expect(result.current.appBloqueadoAtual).toBeNull();
      expect(nativo.registrarDesbloqueioTemporario).not.toHaveBeenCalled();
    });
  });
});
