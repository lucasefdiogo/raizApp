import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRecoveryState } from './useRecoveryState';

jest.mock('../services/firestore');
jest.mock('../utils/storage', () => ({
  ...jest.requireActual('../utils/storage'),
  lerItem: jest.fn(),
  salvarItem: jest.fn(),
}));

const { buscarSystemMessage } = require('../services/firestore');
const { lerItem, salvarItem } = require('../utils/storage');

describe('useRecoveryState', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    lerItem.mockResolvedValue(null);
    salvarItem.mockResolvedValue(undefined);
  });

  it('protegido_escudo ainda não exibido: deveExibir true, tipo escudo', async () => {
    buscarSystemMessage.mockResolvedValue({
      titulo: 'Proteção ativada',
      corpo: 'A proteção cobriu o dia de ontem.',
    });

    const { result } = await renderHook(() =>
      useRecoveryState('protegido_escudo', 5, 12),
    );

    await waitFor(() => expect(result.current.deveExibir).toBe(true));
    expect(result.current.tipo).toBe('escudo');
    expect(buscarSystemMessage).toHaveBeenCalledWith('escudo_ativado');
    expect(result.current.corpo).toBe('A proteção cobriu o dia de ontem.');
  });

  it('perdido ainda não exibido: deveExibir true, tipo reduzido, com placeholders substituídos', async () => {
    buscarSystemMessage.mockResolvedValue({
      titulo: 'Streak reduzido',
      corpo: 'Seu streak caiu para {{streak}} de {{diasTotais}} dias totais.',
    });

    const { result } = await renderHook(() => useRecoveryState('perdido', 3, 20));

    await waitFor(() => expect(result.current.deveExibir).toBe(true));
    expect(result.current.tipo).toBe('reduzido');
    expect(buscarSystemMessage).toHaveBeenCalledWith('streak_reduzido');
    expect(result.current.corpo).toBe('Seu streak caiu para 3 de 20 dias totais.');
  });

  it('já exibido hoje para essa data: não exibe de novo', async () => {
    lerItem.mockResolvedValue(true);
    buscarSystemMessage.mockResolvedValue({ titulo: 't', corpo: 'c' });

    const { result } = await renderHook(() =>
      useRecoveryState('protegido_escudo', 5, 12),
    );

    await waitFor(() => expect(lerItem).toHaveBeenCalled());
    expect(result.current.deveExibir).toBe(false);
    expect(result.current.tipo).toBeNull();
    expect(buscarSystemMessage).not.toHaveBeenCalled();
  });

  it('dia cumprido: não exibe nada e não consulta storage nem systemMessages', async () => {
    const { result } = await renderHook(() => useRecoveryState('cumprido', 5, 12));

    expect(result.current.deveExibir).toBe(false);
    expect(result.current.tipo).toBeNull();
    expect(lerItem).not.toHaveBeenCalled();
    expect(buscarSystemMessage).not.toHaveBeenCalled();
  });

  it('statusDiaAnterior nulo: não exibe nada', async () => {
    const { result } = await renderHook(() => useRecoveryState(null, 5, 12));

    expect(result.current.deveExibir).toBe(false);
    expect(result.current.tipo).toBeNull();
  });

  it('marcarComoExibido grava a chave recovery_shown:{data} e fecha a tela', async () => {
    buscarSystemMessage.mockResolvedValue({ titulo: 't', corpo: 'c' });

    const { result } = await renderHook(() =>
      useRecoveryState('protegido_escudo', 5, 12),
    );
    await waitFor(() => expect(result.current.deveExibir).toBe(true));

    await act(async () => {
      result.current.marcarComoExibido();
    });

    expect(result.current.deveExibir).toBe(false);
    expect(salvarItem).toHaveBeenCalledWith(
      expect.stringMatching(/^recovery_shown:\d{4}-\d{2}-\d{2}$/),
      true,
    );
  });
});
