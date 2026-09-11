import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useVoltarParaAbaHoje } from './useVoltarParaAbaHoje';

// useFocusEffect roda o callback ao ganhar foco e o cleanup ao perder foco.
// Aqui: montar = ganhar foco, desmontar = perder foco (mesmo padrão de
// useBlockHardwareBack.test.tsx).
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      return callback();
    }, [callback]);
  },
  useNavigation: () => mockNavigation,
}));

const navigate = jest.fn();
let mockGetParent: jest.Mock;
let mockNavigation: { getParent: jest.Mock };

describe('useVoltarParaAbaHoje', () => {
  let remove: jest.Mock;
  let addEventListener: jest.SpyInstance;

  beforeEach(() => {
    remove = jest.fn();
    navigate.mockClear();
    addEventListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove } as never);
    mockGetParent = jest.fn().mockReturnValue({ navigate });
    mockNavigation = { getParent: mockGetParent };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registra um listener de hardwareBackPress ao ganhar foco', async () => {
    await renderHook(() => useVoltarParaAbaHoje());

    expect(addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
  });

  it('ao voltar: navega a aba pra HojeTab e engole o evento', async () => {
    await renderHook(() => useVoltarParaAbaHoje());

    const handler = addEventListener.mock.calls[0][1] as () => boolean;
    let consumido: boolean;
    await act(async () => {
      consumido = handler();
    });

    expect(navigate).toHaveBeenCalledWith('HojeTab');
    expect(consumido!).toBe(true);
  });

  it('sem navegador pai (fallback defensivo): não navega e deixa o padrão agir', async () => {
    mockGetParent.mockReturnValue(undefined);
    await renderHook(() => useVoltarParaAbaHoje());

    const handler = addEventListener.mock.calls[0][1] as () => boolean;
    let consumido: boolean;
    await act(async () => {
      consumido = handler();
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(consumido!).toBe(false);
  });

  it('remove o listener ao perder foco (desmontar)', async () => {
    const { unmount } = await renderHook(() => useVoltarParaAbaHoje());
    expect(remove).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
