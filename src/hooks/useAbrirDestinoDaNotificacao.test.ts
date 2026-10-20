import { AppState, DeviceEventEmitter } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useAbrirDestinoDaNotificacao } from './useAbrirDestinoDaNotificacao';
import { consumirDestinoNotificacao } from '../native/DestinoNotificacao';
import { registrarErro } from '../services/crashlytics';

const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  CommonActions: {
    navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }),
  },
}));
jest.mock('../native/DestinoNotificacao');
jest.mock('../services/crashlytics');

const consumirMock = consumirDestinoNotificacao as jest.Mock;

const ACAO_BLOQUEIO = {
  type: 'NAVIGATE',
  payload: { name: 'PerfilTab', params: { screen: 'BloqueioApps' } },
};

describe('useAbrirDestinoDaNotificacao', () => {
  let ouvinte: ((estado: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    ouvinte = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _tipo: string,
      fn: (estado: string) => void,
    ) => {
      ouvinte = fn;
      return { remove: jest.fn() };
    }) as never);
  });

  it('CA-04: com destino pendente bloqueio-apps o app navega para a BloqueioAppsScreen', async () => {
    consumirMock.mockResolvedValue('bloqueio-apps');

    await renderHook(() => useAbrirDestinoDaNotificacao());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(ACAO_BLOQUEIO);
  });

  it('CA-04: sem destino pendente nenhuma navegação acontece', async () => {
    consumirMock.mockResolvedValue(null);

    await renderHook(() => useAbrirDestinoDaNotificacao());

    expect(consumirMock).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('CA-04: destino desconhecido não navega', async () => {
    consumirMock.mockResolvedValue('outra-tela');

    await renderHook(() => useAbrirDestinoDaNotificacao());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('CA-04: o destino pendente é consumido uma vez só', async () => {
    consumirMock
      .mockResolvedValueOnce('bloqueio-apps')
      .mockResolvedValue(null);

    await renderHook(() => useAbrirDestinoDaNotificacao());
    await act(async () => {
      ouvinte?.('active');
    });

    expect(consumirMock).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('CA-04: ao voltar ao primeiro plano com novo destino pendente navega de novo', async () => {
    consumirMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('bloqueio-apps');

    await renderHook(() => useAbrirDestinoDaNotificacao());
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => {
      ouvinte?.('active');
    });

    expect(mockDispatch).toHaveBeenCalledWith(ACAO_BLOQUEIO);
  });

  it('CA-04: falha ao consumir vai para o Crashlytics e não navega', async () => {
    const erro = new Error('falha nativa');
    consumirMock.mockRejectedValue(erro);

    await renderHook(() => useAbrirDestinoDaNotificacao());

    expect(registrarErro).toHaveBeenCalledWith(
      erro,
      'useAbrirDestinoDaNotificacao',
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('CA-04: com o app em primeiro plano, o evento destino-notificacao navega para a BloqueioAppsScreen', async () => {
    consumirMock.mockResolvedValue(null);
    await renderHook(() => useAbrirDestinoDaNotificacao());
    expect(mockDispatch).not.toHaveBeenCalled();

    consumirMock.mockResolvedValue('bloqueio-apps');
    await act(async () => {
      DeviceEventEmitter.emit('destino-notificacao');
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(ACAO_BLOQUEIO);
  });

  it('CA-04: evento recebido durante um consumo em andamento não é descartado', async () => {
    let liberar: (v: string | null) => void = () => {};
    consumirMock
      .mockReturnValueOnce(new Promise((r) => (liberar = r)))
      .mockResolvedValue('bloqueio-apps');
    await renderHook(() => useAbrirDestinoDaNotificacao());

    await act(async () => {
      DeviceEventEmitter.emit('destino-notificacao');
    });
    await act(async () => {
      liberar(null);
    });

    expect(consumirMock).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('CA-04: depois do desmonte o hook não escuta mais o evento', async () => {
    consumirMock.mockResolvedValue(null);
    const { unmount } = await renderHook(() => useAbrirDestinoDaNotificacao());
    await unmount();
    consumirMock.mockClear();
    consumirMock.mockResolvedValue('bloqueio-apps');

    await act(async () => {
      DeviceEventEmitter.emit('destino-notificacao');
    });

    expect(consumirMock).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
