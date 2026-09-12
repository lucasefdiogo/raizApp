import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAccessibilityPermission } from './useAccessibilityPermission';

jest.mock('../native/AccessibilityDetection', () => ({
  isAccessibilityServiceEnabled: jest.fn(),
  openAccessibilitySettings: jest.fn(),
}));

const {
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
} = require('../native/AccessibilityDetection');

describe('useAccessibilityPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isAccessibilityServiceEnabled.mockResolvedValue(false);
  });

  it('começa carregando e resolve pro estado atual do serviço', async () => {
    isAccessibilityServiceEnabled.mockResolvedValue(true);

    const { result } = await renderHook(() => useAccessibilityPermission());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.ativo).toBe(true);
  });

  it('desativado: ativo fica false', async () => {
    isAccessibilityServiceEnabled.mockResolvedValue(false);

    const { result } = await renderHook(() => useAccessibilityPermission());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.ativo).toBe(false);
  });

  it('verificarNovamente reconsulta o módulo nativo e atualiza o estado', async () => {
    isAccessibilityServiceEnabled.mockResolvedValue(false);
    const { result } = await renderHook(() => useAccessibilityPermission());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    isAccessibilityServiceEnabled.mockResolvedValue(true);
    await act(async () => {
      await result.current.verificarNovamente();
    });

    expect(result.current.ativo).toBe(true);
  });

  it('abrirConfiguracoes chama openAccessibilitySettings', async () => {
    const { result } = await renderHook(() => useAccessibilityPermission());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    result.current.abrirConfiguracoes();

    expect(openAccessibilitySettings).toHaveBeenCalledTimes(1);
  });

  it('reavalia sozinho quando o app volta pro primeiro plano (AppState ativo)', async () => {
    const ouvintes: Record<string, (estado: string) => void> = {};
    const addListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((evento: string, cb: (estado: string) => void) => {
        ouvintes[evento] = cb;
        return { remove: jest.fn() } as never;
      }) as never);

    try {
      isAccessibilityServiceEnabled.mockResolvedValue(false);
      const { result } = await renderHook(() => useAccessibilityPermission());
      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(isAccessibilityServiceEnabled).toHaveBeenCalledTimes(1);

      isAccessibilityServiceEnabled.mockResolvedValue(true);
      await act(async () => {
        ouvintes.change?.('active');
      });

      expect(isAccessibilityServiceEnabled).toHaveBeenCalledTimes(2);
      expect(result.current.ativo).toBe(true);
    } finally {
      addListener.mockRestore();
    }
  });

  it('não reavalia quando o app vai pro background (AppState inativo)', async () => {
    const ouvintes: Record<string, (estado: string) => void> = {};
    const addListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((evento: string, cb: (estado: string) => void) => {
        ouvintes[evento] = cb;
        return { remove: jest.fn() } as never;
      }) as never);

    try {
      const { result } = await renderHook(() => useAccessibilityPermission());
      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(isAccessibilityServiceEnabled).toHaveBeenCalledTimes(1);

      await act(async () => {
        ouvintes.change?.('background');
      });

      expect(isAccessibilityServiceEnabled).toHaveBeenCalledTimes(1);
    } finally {
      addListener.mockRestore();
    }
  });
});
