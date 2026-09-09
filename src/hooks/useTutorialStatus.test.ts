import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTutorialStatus } from './useTutorialStatus';

describe('useTutorialStatus', () => {
  afterEach(async () => {
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

  it('marcarTutorialVisto grava a flag e atualiza o estado', async () => {
    const { result } = await renderHook(() => useTutorialStatus());
    expect(result.current.tutorialVisto).toBe(false);

    await act(async () => {
      await result.current.marcarTutorialVisto();
    });

    expect(result.current.tutorialVisto).toBe(true);
    const salvo = await AsyncStorage.getItem('tutorial_visto');
    expect(salvo).toBe('true');
  });
});
