import { act, renderHook } from '@testing-library/react-native';
import { useRecarregarAoFocar } from './useRecarregarAoFocar';

// useFocusEffect roda o callback ao ganhar foco e o cleanup ao perder foco.
// Aqui: montar = ganhar foco (mesmo padrão de useBlockHardwareBack.test.tsx
// e useVoltarParaAbaHoje.test.tsx).
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      return callback();
    }, [callback]);
  },
}));

describe('useRecarregarAoFocar', () => {
  it('chama recarregar ao ganhar foco (inclusive no mount inicial)', async () => {
    const recarregar = jest.fn();
    await renderHook(() => useRecarregarAoFocar(recarregar));

    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('chama recarregar de novo quando a função recarregar muda (simula reganhar foco)', async () => {
    const primeiraRecarregar = jest.fn();
    const { rerender } = await renderHook(
      ({ recarregar }: { recarregar: () => void }) =>
        useRecarregarAoFocar(recarregar),
      { initialProps: { recarregar: primeiraRecarregar } },
    );
    expect(primeiraRecarregar).toHaveBeenCalledTimes(1);

    const segundaRecarregar = jest.fn();
    await act(async () => {
      rerender({ recarregar: segundaRecarregar });
    });

    expect(segundaRecarregar).toHaveBeenCalledTimes(1);
  });
});
