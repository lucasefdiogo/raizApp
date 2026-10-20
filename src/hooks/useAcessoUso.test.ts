import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useAcessoUso } from './useAcessoUso';

jest.mock('../native/UsoApps');

const { temAcessoUso } = require('../native/UsoApps');

describe('useAcessoUso', () => {
  let ouvinte: ((estado: string) => void) | undefined;

  beforeEach(() => {
    jest.resetAllMocks();
    ouvinte = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _tipo: string,
      fn: (estado: string) => void,
    ) => {
      ouvinte = fn;
      return { remove: jest.fn() };
    }) as never);
  });

  it('CA-06: sem acesso de uso concedido, resolve concedido=false', async () => {
    temAcessoUso.mockResolvedValue(false);

    const { result } = await renderHook(() => useAcessoUso());

    expect(result.current.carregando).toBe(false);
    expect(result.current.concedido).toBe(false);
  });

  it('CA-07: reavalia ao voltar ao primeiro plano e reflete a concessão', async () => {
    temAcessoUso.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { result } = await renderHook(() => useAcessoUso());
    expect(result.current.concedido).toBe(false);

    await act(async () => {
      ouvinte?.('active');
    });

    expect(result.current.concedido).toBe(true);
  });
});
