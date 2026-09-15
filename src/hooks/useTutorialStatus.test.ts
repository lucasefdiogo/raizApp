import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTutorialStatus } from './useTutorialStatus';

jest.mock('../services/analytics');
const { logTutorialConcluido } = require('../services/analytics');

describe('useTutorialStatus', () => {
  afterEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('termina de carregar indicando tutorial não visto quando a flag está ausente', async () => {
    const { result } = await renderHook(() => useTutorialStatus());

    expect(result.current.carregando).toBe(false);
    expect(result.current.tutorialVisto).toBe(false);
  });

  it('indica tutorial visto quando a flag já está salva como true', async () => {
    await AsyncStorage.setItem('tutorial_visto', JSON.stringify(true));

    const { result } = await renderHook(() => useTutorialStatus());

    expect(result.current.carregando).toBe(false);
    expect(result.current.tutorialVisto).toBe(true);
  });

  it('marcarTutorialVisto(true) grava a flag, atualiza o estado e dispara logTutorialConcluido', async () => {
    const { result } = await renderHook(() => useTutorialStatus());
    expect(result.current.tutorialVisto).toBe(false);

    await act(async () => {
      await result.current.marcarTutorialVisto(true);
    });

    expect(result.current.tutorialVisto).toBe(true);
    const salvo = await AsyncStorage.getItem('tutorial_visto');
    expect(salvo).toBe('true');
    expect(logTutorialConcluido).toHaveBeenCalledTimes(1);
  });

  it('marcarTutorialVisto(false) (pulou) grava a flag mas NÃO dispara logTutorialConcluido', async () => {
    const { result } = await renderHook(() => useTutorialStatus());

    await act(async () => {
      await result.current.marcarTutorialVisto(false);
    });

    expect(result.current.tutorialVisto).toBe(true);
    expect(logTutorialConcluido).not.toHaveBeenCalled();
  });
});
