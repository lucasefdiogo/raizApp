import React from 'react';
import { BackHandler } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { InterceptRoot } from './InterceptRoot';

// InterceptRoot monta o próprio SafeAreaProvider (é um root separado, sem
// nenhum ancestral) — sem initialMetrics, o Provider real fica esperando
// insets nativos que nunca chegam no test renderer, e os filhos nunca
// aparecem. Mock oficial da lib: children renderizam na hora com métricas
// default.
jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...require('react-native-safe-area-context/jest/mock').default,
}));

jest.mock('../../hooks/useAuth');
jest.mock('../../native/AccessibilityDetection', () => ({
  ...jest.requireActual('../../native/AccessibilityDetection'),
  listarAppsInstalados: jest.fn(),
}));

const mockCapturarProps = jest.fn();
jest.mock('./InterceptScreen', () => ({
  InterceptScreen: (props: Record<string, unknown>) => {
    mockCapturarProps(props);
    return null;
  },
}));

const { useAuth } = require('../../hooks/useAuth');
const { listarAppsInstalados } = require('../../native/AccessibilityDetection');

const props = {
  packageName: 'com.instagram.android',
  appLabel: 'Instagram',
  snapshotJson: JSON.stringify({ tarefas: [] }),
};

describe('InterceptRoot', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    listarAppsInstalados.mockResolvedValue([
      { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'icone-instagram' },
      { packageName: 'com.whatsapp', nome: 'WhatsApp', iconeBase64: 'icone-whatsapp' },
    ]);
  });

  it('enquanto o auth carrega: mostra o LoadingIndicator, sem montar a InterceptScreen', async () => {
    useAuth.mockReturnValue({ carregando: true, user: null });
    await render(<InterceptRoot {...props} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(mockCapturarProps).not.toHaveBeenCalled();
  });

  it('sem usuário logado (não deveria acontecer na prática): também não monta a InterceptScreen', async () => {
    useAuth.mockReturnValue({ carregando: false, user: null });
    await render(<InterceptRoot {...props} />);

    expect(mockCapturarProps).not.toHaveBeenCalled();
  });

  it('com usuário resolvido: monta a InterceptScreen com o uid e repassa packageName/appLabel/snapshot já parseado', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} />);

    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'uid-teste',
          packageName: 'com.instagram.android',
          appLabel: 'Instagram',
          snapshot: { tarefas: [] },
          sessaoAtivaResumida: null,
          visaoInicial: null,
        }),
      ),
    );
  });

  it('HU-11 RN01: resolve o ícone do app interceptado via listarAppsInstalados', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} />);

    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenCalledWith(
        expect.objectContaining({ appIconeBase64: 'icone-instagram' }),
      ),
    );
  });

  it('app não encontrado na lista: resolve o ícone como string vazia, sem quebrar', async () => {
    listarAppsInstalados.mockResolvedValue([]);
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} />);

    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenCalledWith(
        expect.objectContaining({ appIconeBase64: '' }),
      ),
    );
  });

  it('snapshotJson inválido: cai pro fallback { tarefas: [] } em vez de quebrar', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} snapshotJson="{não é json}" />);

    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenCalledWith(
        expect.objectContaining({ snapshot: { tarefas: [] } }),
      ),
    );
  });

  it('sessaoAtivaJson presente e válido: repassa sessaoAtivaResumida com duracaoRestanteSeg derivado de fimEm', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(
      <InterceptRoot
        {...props}
        sessaoAtivaJson={JSON.stringify({
          packageName: 'com.instagram.android',
          tarefaId: 'tarefa-1',
          estadoTravado: 'confusao',
          fimEm: 1_000_000 + 42_000,
        })}
      />,
    );

    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenCalledWith(
        expect.objectContaining({
          sessaoAtivaResumida: {
            tarefaId: 'tarefa-1',
            estadoTravado: 'confusao',
            duracaoRestanteSeg: 42,
          },
        }),
      ),
    );
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('sessaoAtivaJson inválido: repassa sessaoAtivaResumida null em vez de quebrar', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} sessaoAtivaJson="{também não}" />);

    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenCalledWith(
        expect.objectContaining({ sessaoAtivaResumida: null }),
      ),
    );
  });

  it('estadoBloqueioJson válido vira visaoInicial; inválido ou ausente vira null', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    const visao = {
      estado: { dia: '2026-10-11', fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
      config: { duracaoBlocoMin: 15 },
      agora: 1_700_000_000_000,
    };
    await render(
      <InterceptRoot {...props} estadoBloqueioJson={JSON.stringify(visao)} />,
    );
    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ visaoInicial: visao }),
      ),
    );

    await render(<InterceptRoot {...props} estadoBloqueioJson="{quebrado" />);
    await waitFor(() =>
      expect(mockCapturarProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ visaoInicial: null }),
      ),
    );
  });

  it('onSair é BackHandler.exitApp', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    const exitApp = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {});
    await render(<InterceptRoot {...props} />);

    await waitFor(() => expect(mockCapturarProps).toHaveBeenCalled());
    const { onSair } = mockCapturarProps.mock.calls[0][0];
    onSair();

    expect(exitApp).toHaveBeenCalledTimes(1);
    exitApp.mockRestore();
  });
});
