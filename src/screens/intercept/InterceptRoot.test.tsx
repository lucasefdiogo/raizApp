import React from 'react';
import { BackHandler } from 'react-native';
import { render, screen } from '@testing-library/react-native';
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

const mockCapturarProps = jest.fn();
jest.mock('./InterceptScreen', () => ({
  InterceptScreen: (props: Record<string, unknown>) => {
    mockCapturarProps(props);
    return null;
  },
}));

const { useAuth } = require('../../hooks/useAuth');

const props = {
  packageName: 'com.instagram.android',
  appLabel: 'Instagram',
  snapshotJson: JSON.stringify({ tarefas: [] }),
};

describe('InterceptRoot', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

    expect(mockCapturarProps).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid-teste',
        packageName: 'com.instagram.android',
        appLabel: 'Instagram',
        snapshot: { tarefas: [] },
        sessaoAtivaResumida: null,
      }),
    );
  });

  it('snapshotJson inválido: cai pro fallback { tarefas: [] } em vez de quebrar', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} snapshotJson="{não é json}" />);

    expect(mockCapturarProps).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: { tarefas: [] } }),
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

    expect(mockCapturarProps).toHaveBeenCalledWith(
      expect.objectContaining({
        sessaoAtivaResumida: {
          tarefaId: 'tarefa-1',
          estadoTravado: 'confusao',
          duracaoRestanteSeg: 42,
        },
      }),
    );
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('sessaoAtivaJson inválido: repassa sessaoAtivaResumida null em vez de quebrar', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    await render(<InterceptRoot {...props} sessaoAtivaJson="{também não}" />);

    expect(mockCapturarProps).toHaveBeenCalledWith(
      expect.objectContaining({ sessaoAtivaResumida: null }),
    );
  });

  it('sem aoSairOverride: onSair é BackHandler.exitApp', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    const exitApp = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {});
    await render(<InterceptRoot {...props} />);

    const { onSair } = mockCapturarProps.mock.calls[0][0];
    onSair();

    expect(exitApp).toHaveBeenCalledTimes(1);
    exitApp.mockRestore();
  });

  it('com aoSairOverride: é ele quem vira onSair, BackHandler.exitApp nunca é chamado', async () => {
    useAuth.mockReturnValue({ carregando: false, user: { uid: 'uid-teste' } });
    const exitApp = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {});
    const aoSairOverride = jest.fn();
    await render(<InterceptRoot {...props} aoSairOverride={aoSairOverride} />);

    const { onSair } = mockCapturarProps.mock.calls[0][0];
    onSair();

    expect(aoSairOverride).toHaveBeenCalledTimes(1);
    expect(exitApp).not.toHaveBeenCalled();
    exitApp.mockRestore();
  });
});
