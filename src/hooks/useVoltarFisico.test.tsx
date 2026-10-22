import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useVoltarFisico } from './useVoltarFisico';

// useFocusEffect roda o callback ao ganhar foco e o cleanup ao perder foco.
// Aqui: montar = ganhar foco, desmontar = perder foco.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      return callback();
    }, [callback]);
  },
}));

describe('useVoltarFisico', () => {
  let remove: jest.Mock;
  let addEventListener: jest.SpyInstance;

  beforeEach(() => {
    remove = jest.fn();
    addEventListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('o voltar físico chama o handler e não segue o comportamento padrão', async () => {
    const aoVoltar = jest.fn();
    await renderHook(() => useVoltarFisico(aoVoltar));

    const handler = addEventListener.mock.calls[0][1] as () => boolean;

    expect(handler()).toBe(true);
    expect(aoVoltar).toHaveBeenCalledTimes(1);
  });

  it('usa sempre o handler mais recente sem registrar o listener de novo', async () => {
    const primeiro = jest.fn();
    const segundo = jest.fn();
    const { rerender } = await renderHook(
      ({ aoVoltar }: { aoVoltar: () => void }) => useVoltarFisico(aoVoltar),
      { initialProps: { aoVoltar: primeiro } },
    );

    await rerender({ aoVoltar: segundo });
    const handler = addEventListener.mock.calls[0][1] as () => boolean;
    handler();

    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(primeiro).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledTimes(1);
  });

  it('remove o listener ao perder foco (desmontar)', async () => {
    const { unmount } = await renderHook(() => useVoltarFisico(jest.fn()));
    expect(remove).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
