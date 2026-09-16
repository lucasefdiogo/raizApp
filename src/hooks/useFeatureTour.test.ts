import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeatureTour } from './useFeatureTour';
import { STORAGE_KEYS } from '../utils/storage';
import { TOTAL_PASSOS_TOUR } from '../components/tour/tourSteps';

// Mesmo padrão de useVoltarParaAbaHoje.test.tsx: useFocusEffect vira um
// useEffect comum (montar = ganhar foco), e useNavigation devolve um mock
// controlável de getParent().navigate.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => callback(), [callback]);
  },
  useNavigation: () => mockNavigation,
}));
jest.mock('../services/analytics');
const {
  logTourFuncionalidadesConcluido,
  logTourFuncionalidadesPulado,
} = require('../services/analytics');

const navigate = jest.fn();
let mockNavigation: { getParent: jest.Mock };

describe('useFeatureTour', () => {
  beforeEach(async () => {
    navigate.mockClear();
    jest.clearAllMocks();
    mockNavigation = { getParent: jest.fn().mockReturnValue({ navigate }) };
    await AsyncStorage.clear();
  });

  it('nunca visto (flag ausente): tourAtivo começa true, no passo 0', async () => {
    const { result } = await renderHook(() => useFeatureTour());

    await waitFor(() => expect(result.current.tourAtivo).toBe(true));
    expect(result.current.passoAtual).toBe(0);
  });

  it('já visto (flag true no AsyncStorage): tourAtivo nunca fica true', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.tourFuncionalidadesVisto,
      JSON.stringify(true),
    );

    const { result } = await renderHook(() => useFeatureTour());

    await waitFor(() => expect(result.current.passoAtual).toBe(0));
    expect(result.current.tourAtivo).toBe(false);
  });

  it('avancar() percorre os 5 passos e conclui (tourAtivo false) no último, gravando a flag', async () => {
    const { result } = await renderHook(() => useFeatureTour());
    await waitFor(() => expect(result.current.tourAtivo).toBe(true));

    for (let esperado = 1; esperado < TOTAL_PASSOS_TOUR; esperado += 1) {
      await act(async () => {
        result.current.avancar();
      });
      expect(result.current.passoAtual).toBe(esperado);
      expect(result.current.tourAtivo).toBe(true);
      expect(logTourFuncionalidadesConcluido).not.toHaveBeenCalled();
    }

    // último passo (índice TOTAL_PASSOS_TOUR - 1) — avancar() conclui em vez
    // de tentar ir pro passo 5 (que não existe).
    await act(async () => {
      result.current.avancar();
    });

    expect(result.current.tourAtivo).toBe(false);
    expect(
      await AsyncStorage.getItem(STORAGE_KEYS.tourFuncionalidadesVisto),
    ).toBe(JSON.stringify(true));
    expect(logTourFuncionalidadesConcluido).toHaveBeenCalledTimes(1);
    expect(logTourFuncionalidadesPulado).not.toHaveBeenCalled();
  });

  it('pular() encerra o tour imediatamente em qualquer passo, gravando a flag', async () => {
    const { result } = await renderHook(() => useFeatureTour());
    await waitFor(() => expect(result.current.tourAtivo).toBe(true));

    await act(async () => {
      result.current.avancar();
      result.current.avancar();
    });
    expect(result.current.passoAtual).toBe(2);

    await act(async () => {
      result.current.pular();
    });

    expect(result.current.tourAtivo).toBe(false);
    expect(
      await AsyncStorage.getItem(STORAGE_KEYS.tourFuncionalidadesVisto),
    ).toBe(JSON.stringify(true));
    expect(logTourFuncionalidadesPulado).toHaveBeenCalledWith(2);
    expect(logTourFuncionalidadesConcluido).not.toHaveBeenCalled();
  });

  it('reiniciar() (chamado da Perfil): limpa a flag, reativa o tour do passo 0 e navega pra HojeTab', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.tourFuncionalidadesVisto,
      JSON.stringify(true),
    );
    const { result } = await renderHook(() => useFeatureTour());
    await waitFor(() => expect(result.current.tourAtivo).toBe(false));

    await act(async () => {
      result.current.reiniciar();
    });

    expect(result.current.tourAtivo).toBe(true);
    expect(result.current.passoAtual).toBe(0);
    expect(navigate).toHaveBeenCalledWith('HojeTab');
    expect(
      await AsyncStorage.getItem(STORAGE_KEYS.tourFuncionalidadesVisto),
    ).toBe(JSON.stringify(false));
  });

  it('reiniciar() sem navegador pai (fallback defensivo): ainda reativa o tour, só não navega', async () => {
    mockNavigation.getParent.mockReturnValue(undefined);
    await AsyncStorage.setItem(
      STORAGE_KEYS.tourFuncionalidadesVisto,
      JSON.stringify(true),
    );
    const { result } = await renderHook(() => useFeatureTour());
    await waitFor(() => expect(result.current.tourAtivo).toBe(false));

    await act(async () => {
      result.current.reiniciar();
    });

    expect(result.current.tourAtivo).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
