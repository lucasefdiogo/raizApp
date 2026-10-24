import { act, renderHook } from '@testing-library/react-native';
import { useCooldownRestante } from './useCooldownRestante';
import { estadoInicialDia } from '../domain/saldoBloqueio';

jest.mock('../native/AccessibilityDetection');
jest.mock('../services/crashlytics');
const nativoMock = require('../native/AccessibilityDetection');
const { obterEstadoBloqueio } = nativoMock;
const { registrarErro } = require('../services/crashlytics');

let callbackDeFoco: (() => (() => void) | undefined) | null = null;
let ultimoCleanupDeFoco: (() => void) | undefined;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      callbackDeFoco = callback;
      const cleanup = callback();
      ultimoCleanupDeFoco = cleanup;
      return cleanup;
    }, [callback]);
  },
}));

function visaoEmCooldown(fimCooldownEm: number) {
  return {
    estado: { ...estadoInicialDia('2026-10-24'), fase: 'COOLDOWN' as const, fimCooldownEm },
    config: { duracaoBlocoMin: 15, cooldownMin: 45, blocosDiarios: null, blocoPorTarefaExtra: 1 },
    agora: Date.now(),
  };
}

describe('HU-14 · useCooldownRestante', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    callbackDeFoco = null;
    jest.useFakeTimers().setSystemTime(new Date('2026-10-24T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('começa sem nenhum valor antes do nativo responder', async () => {
    obterEstadoBloqueio.mockResolvedValue(null);
    const { result } = await renderHook(() => useCooldownRestante());
    expect(result.current.minutosRestantes).toBeNull();
  });

  it('Cenário 5: em COOLDOWN, expõe os minutos restantes ao focar', async () => {
    obterEstadoBloqueio.mockResolvedValue(visaoEmCooldown(Date.now() + 32 * 60_000));

    const { result } = await renderHook(() => useCooldownRestante());

    expect(result.current.minutosRestantes).toBe(32);
  });

  it('fora de COOLDOWN, minutosRestantes é null', async () => {
    obterEstadoBloqueio.mockResolvedValue({
      estado: { ...estadoInicialDia('2026-10-24'), fase: 'AGUARDANDO_LIBERACAO' },
      config: { duracaoBlocoMin: 15, cooldownMin: 45, blocosDiarios: null, blocoPorTarefaExtra: 1 },
      agora: Date.now(),
    });

    const { result } = await renderHook(() => useCooldownRestante());

    expect(result.current.minutosRestantes).toBeNull();
  });

  it('Cenário 7: atualiza a cada 1 minuto com a tela em foco', async () => {
    obterEstadoBloqueio.mockResolvedValue(visaoEmCooldown(Date.now() + 32 * 60_000));

    const { result, unmount } = await renderHook(() => useCooldownRestante());
    expect(result.current.minutosRestantes).toBe(32);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current.minutosRestantes).toBe(31);
    expect(obterEstadoBloqueio).toHaveBeenCalledTimes(2);
    // Sem isso, o intervalo deste teste seguiria rodando e poluiria o próximo.
    await unmount();
  });

  it('RN06: para de atualizar ao perder o foco (cleanup do intervalo)', async () => {
    obterEstadoBloqueio.mockResolvedValue(visaoEmCooldown(Date.now() + 32 * 60_000));

    const { result, unmount } = await renderHook(() => useCooldownRestante());
    expect(obterEstadoBloqueio).toHaveBeenCalledTimes(1);

    await act(async () => {
      ultimoCleanupDeFoco?.();
    });

    await act(async () => {
      jest.advanceTimersByTime(5 * 60_000);
    });

    expect(obterEstadoBloqueio).toHaveBeenCalledTimes(1);
    expect(result.current.minutosRestantes).toBe(32);
    await unmount();
  });

  it('Cenário 8/RN07: ao reganhar foco depois de o cooldown acabar, o banner some', async () => {
    obterEstadoBloqueio.mockResolvedValue(visaoEmCooldown(Date.now() + 1 * 60_000));
    const { result, rerender } = await renderHook(() => useCooldownRestante());
    expect(result.current.minutosRestantes).toBe(1);

    obterEstadoBloqueio.mockResolvedValue({
      estado: { ...estadoInicialDia('2026-10-24'), fase: 'AGUARDANDO_LIBERACAO' },
      config: { duracaoBlocoMin: 15, cooldownMin: 45, blocosDiarios: null, blocoPorTarefaExtra: 1 },
      agora: Date.now(),
    });
    await act(async () => {
      await callbackDeFoco?.();
    });
    rerender(undefined);

    expect(result.current.minutosRestantes).toBeNull();
  });

  it('erro ao ler o nativo registra no crashlytics e mantém o valor anterior', async () => {
    obterEstadoBloqueio.mockRejectedValueOnce(new Error('falhou'));
    const { result } = await renderHook(() => useCooldownRestante());

    expect(result.current.minutosRestantes).toBeNull();
    expect(registrarErro).toHaveBeenCalledWith(expect.any(Error), 'useCooldownRestante.atualizar');
  });
});
