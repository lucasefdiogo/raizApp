import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAtivacaoBloqueio } from './useAtivacaoBloqueio';
import { STORAGE_KEYS } from '../utils/storage';

describe('useAtivacaoBloqueio', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('pronto=true e sem a flag gravada: deveExibirAtivacao começa true', async () => {
    const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', true));
    await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(true));
  });

  it('pronto=false: deveExibirAtivacao nunca vira true', async () => {
    const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', false));
    await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(false));
  });

  it('com a flag já gravada: deveExibirAtivacao começa false', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ativacaoBloqueioMostrada,
      JSON.stringify(true),
    );
    const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', true));
    await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(false));
  });

  it('concluirAtivacao grava a flag e vira false', async () => {
    const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', true));
    await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(true));
    await act(() => result.current.concluirAtivacao());
    expect(result.current.deveExibirAtivacao).toBe(false);
    expect(
      JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.ativacaoBloqueioMostrada))!),
    ).toBe(true);
  });
});
