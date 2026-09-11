import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppBlockBannerDismissido } from './useAppBlockBannerDismissido';

describe('useAppBlockBannerDismissido', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('começa como não dispensado quando nada foi salvo ainda', async () => {
    const { result } = await renderHook(() => useAppBlockBannerDismissido());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dispensadoHoje).toBe(false);
  });

  it('dispensarHoje marca como dispensado imediatamente (otimista)', async () => {
    const { result } = await renderHook(() => useAppBlockBannerDismissido());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.dispensarHoje();
    });

    expect(result.current.dispensadoHoje).toBe(true);
  });

  it('uma nova montagem no mesmo dia lê o dispensado já salvo', async () => {
    const { result: primeira } = await renderHook(() =>
      useAppBlockBannerDismissido(),
    );
    await waitFor(() => expect(primeira.current.carregando).toBe(false));
    await act(async () => {
      primeira.current.dispensarHoje();
    });

    const { result: segunda } = await renderHook(() =>
      useAppBlockBannerDismissido(),
    );
    await waitFor(() => expect(segunda.current.carregando).toBe(false));

    expect(segunda.current.dispensadoHoje).toBe(true);
  });
});
