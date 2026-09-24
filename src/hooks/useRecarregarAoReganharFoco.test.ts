import { renderHook, act } from '@testing-library/react-native';
import { useRecarregarAoReganharFoco } from './useRecarregarAoReganharFoco';

// Mesmo padrão de useRecarregarAoFocar.test.tsx: montar = ganhar foco.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      return callback();
    }, [callback]);
  },
}));

describe('useRecarregarAoReganharFoco', () => {
  it('não chama recarregar no mount inicial (primeiro foco)', async () => {
    const recarregar = jest.fn();
    await renderHook(() => useRecarregarAoReganharFoco(recarregar));

    expect(recarregar).not.toHaveBeenCalled();
  });

  it('chama recarregar quando a função recarregar muda (simula reganhar foco depois do mount)', async () => {
    const primeiraRecarregar = jest.fn();
    const { rerender } = await renderHook(
      ({ recarregar }: { recarregar: () => void }) =>
        useRecarregarAoReganharFoco(recarregar),
      { initialProps: { recarregar: primeiraRecarregar } },
    );
    expect(primeiraRecarregar).not.toHaveBeenCalled();

    const segundaRecarregar = jest.fn();
    await act(async () => {
      rerender({ recarregar: segundaRecarregar });
    });

    expect(segundaRecarregar).toHaveBeenCalledTimes(1);
  });

  it('foco seguinte chama de novo (não é "só uma vez depois do mount")', async () => {
    const r1 = jest.fn();
    const { rerender } = await renderHook(
      ({ recarregar }: { recarregar: () => void }) =>
        useRecarregarAoReganharFoco(recarregar),
      { initialProps: { recarregar: r1 } },
    );

    const r2 = jest.fn();
    await act(async () => {
      rerender({ recarregar: r2 });
    });
    expect(r2).toHaveBeenCalledTimes(1);

    const r3 = jest.fn();
    await act(async () => {
      rerender({ recarregar: r3 });
    });
    expect(r3).toHaveBeenCalledTimes(1);
  });
});
