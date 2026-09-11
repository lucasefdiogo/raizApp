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

jest.mock('../services/firestore', () => ({
  buscarDesbloqueiosHojeDoApp: jest.fn(),
  incrementarDesbloqueiosHoje: jest.fn(),
}));

const nativo = require('../native/AccessibilityDetection');
const firestore = require('../services/firestore');

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
    firestore.buscarDesbloqueiosHojeDoApp.mockResolvedValue(0);
    firestore.incrementarDesbloqueiosHoje.mockResolvedValue(undefined);
  });

  it('começa sem app bloqueado quando não há intent pendente', async () => {
    const { result } = await renderHook(() => useAppBlocking('uid-teste'));

    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());
    expect(result.current.appBloqueadoAtual).toBeNull();
    expect(nativo.getInstalledApps).not.toHaveBeenCalled();
  });

  it('resolve o app pendente do cold start (getInitialBlockedPackage) com nome e ícone', async () => {
    nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
    const { result } = await renderHook(() => useAppBlocking('uid-teste'));

    await waitFor(() =>
      expect(result.current.appBloqueadoAtual).toEqual({
        packageName: 'com.instagram.android',
        nome: 'Instagram',
        icone: 'data:image/png;base64,QQ==',
      }),
    );
  });

  it('atualiza appBloqueadoAtual quando o evento blocked-app-detected dispara', async () => {
    const { result } = await renderHook(() => useAppBlocking('uid-teste'));
    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());

    await emitirBloqueado('com.whatsapp');

    expect(result.current.appBloqueadoAtual).toEqual({
      packageName: 'com.whatsapp',
      nome: 'WhatsApp',
      icone: null,
    });
  });

  it('usa o próprio packageName como nome quando não encontra na lista de apps', async () => {
    const { result } = await renderHook(() => useAppBlocking('uid-teste'));
    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());

    await emitirBloqueado('com.desconhecido');

    expect(result.current.appBloqueadoAtual).toEqual({
      packageName: 'com.desconhecido',
      nome: 'com.desconhecido',
      icone: null,
    });
  });

  it('só chama getInstalledApps uma vez pra dois bloqueios seguidos (cacheado)', async () => {
    const { result } = await renderHook(() => useAppBlocking('uid-teste'));
    await waitFor(() => expect(nativo.getInitialBlockedPackage).toHaveBeenCalled());

    await emitirBloqueado('com.instagram.android');
    await emitirBloqueado('com.whatsapp');

    expect(result.current.appBloqueadoAtual?.packageName).toBe('com.whatsapp');
    expect(nativo.getInstalledApps).toHaveBeenCalledTimes(1);
  });

  describe('nível de escalação (nivelAtual/duracaoRespiracaoSegundos/precisaReflexao)', () => {
    it('sem app bloqueado ainda: nível 1 (nenhuma busca de desbloqueiosHoje disparada)', async () => {
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));

      expect(result.current.duracaoRespiracaoSegundos).toBe(60);
      expect(result.current.precisaReflexao).toBe(false);
      expect(firestore.buscarDesbloqueiosHojeDoApp).not.toHaveBeenCalled();
    });

    it('0 desbloqueios hoje: nível 1 — 60s, sem reflexão', async () => {
      firestore.buscarDesbloqueiosHojeDoApp.mockResolvedValue(0);
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));

      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());
      await waitFor(() => expect(result.current.duracaoRespiracaoSegundos).toBe(60));
      expect(result.current.precisaReflexao).toBe(false);
      expect(firestore.buscarDesbloqueiosHojeDoApp).toHaveBeenCalledWith(
        'uid-teste',
        expect.any(String),
      );
    });

    it('1 desbloqueio hoje: nível 2 — 90s, com reflexão', async () => {
      firestore.buscarDesbloqueiosHojeDoApp.mockResolvedValue(1);
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));

      await waitFor(() => expect(result.current.duracaoRespiracaoSegundos).toBe(90));
      expect(result.current.precisaReflexao).toBe(true);
    });

    it('2 desbloqueios hoje: nível 3 — 120s, com reflexão', async () => {
      firestore.buscarDesbloqueiosHojeDoApp.mockResolvedValue(2);
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));

      await waitFor(() => expect(result.current.duracaoRespiracaoSegundos).toBe(120));
      expect(result.current.precisaReflexao).toBe(true);
    });

    it('teto: 5 desbloqueios hoje continuam nível 3 — 120s, não escala mais', async () => {
      firestore.buscarDesbloqueiosHojeDoApp.mockResolvedValue(5);
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));

      await waitFor(() => expect(result.current.duracaoRespiracaoSegundos).toBe(120));
      expect(result.current.precisaReflexao).toBe(true);
    });

    it('sem uid: não busca desbloqueiosHoje e fica no nível 1', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking(null));

      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());
      expect(firestore.buscarDesbloqueiosHojeDoApp).not.toHaveBeenCalled();
      expect(result.current.duracaoRespiracaoSegundos).toBe(60);
      expect(result.current.precisaReflexao).toBe(false);
    });
  });

  describe('desbloquear', () => {
    it('registra o desbloqueio temporário pro packageName atual, sem fechar a tela', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));
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

    it('incrementa desbloqueiosHoje (uid + data de hoje) antes de registrar o desbloqueio nativo', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));
      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());

      await act(async () => {
        result.current.desbloquear(15);
      });

      expect(firestore.incrementarDesbloqueiosHoje).toHaveBeenCalledWith(
        'uid-teste',
        expect.any(String),
      );
    });

    it('sem uid: não chama incrementarDesbloqueiosHoje, mas ainda registra o desbloqueio nativo', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking(null));
      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());

      await act(async () => {
        result.current.desbloquear(15);
      });

      expect(firestore.incrementarDesbloqueiosHoje).not.toHaveBeenCalled();
      expect(nativo.registrarDesbloqueioTemporario).toHaveBeenCalledWith(
        'com.instagram.android',
        15,
      );
    });

    it('não faz nada sem app bloqueado atual', async () => {
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));

      await act(async () => {
        result.current.desbloquear(15);
      });

      expect(nativo.registrarDesbloqueioTemporario).not.toHaveBeenCalled();
      expect(firestore.incrementarDesbloqueiosHoje).not.toHaveBeenCalled();
    });
  });

  describe('dispensar', () => {
    it('limpa appBloqueadoAtual sem registrar desbloqueio', async () => {
      nativo.getInitialBlockedPackage.mockResolvedValue('com.instagram.android');
      const { result } = await renderHook(() => useAppBlocking('uid-teste'));
      await waitFor(() => expect(result.current.appBloqueadoAtual).not.toBeNull());

      await act(async () => {
        result.current.dispensar();
      });

      expect(result.current.appBloqueadoAtual).toBeNull();
      expect(nativo.registrarDesbloqueioTemporario).not.toHaveBeenCalled();
    });
  });
});
