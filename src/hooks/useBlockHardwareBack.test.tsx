import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useBlockHardwareBack } from './useBlockHardwareBack';

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

describe('useBlockHardwareBack', () => {
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

  it('registra um listener de hardwareBackPress ao ganhar foco', async () => {
    await renderHook(() => useBlockHardwareBack());

    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
  });

  it('o handler retorna true — o evento de voltar é engolido', async () => {
    await renderHook(() => useBlockHardwareBack());

    const handler = addEventListener.mock.calls[0][1] as () => boolean;
    expect(handler()).toBe(true);
  });

  it('remove o listener ao perder foco (desmontar)', async () => {
    const { unmount } = await renderHook(() => useBlockHardwareBack());
    expect(remove).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
