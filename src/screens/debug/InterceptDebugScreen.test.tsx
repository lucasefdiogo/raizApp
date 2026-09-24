import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InterceptDebugScreen } from './InterceptDebugScreen';

const mockCapturarProps = jest.fn();
jest.mock('../intercept/InterceptRoot', () => ({
  InterceptRoot: (props: Record<string, unknown>) => {
    mockCapturarProps(props);
    return null;
  },
}));

describe('InterceptDebugScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('mostra os 3 botões de simulação e nenhum InterceptRoot antes de tocar', async () => {
    await render(<InterceptDebugScreen />);

    expect(
      screen.getByText('Simular estado A (essencial pendente)'),
    ).toBeTruthy();
    expect(
      screen.getByText('Simular estado B (essencial já cumprido)'),
    ).toBeTruthy();
    expect(
      screen.getByText('Simular estado C (nenhuma tarefa hoje)'),
    ).toBeTruthy();
    expect(mockCapturarProps).not.toHaveBeenCalled();
  });

  it('estado A: abre o InterceptRoot com uma tarefa essencial pendente', async () => {
    await render(<InterceptDebugScreen />);

    await fireEvent.press(
      screen.getByText('Simular estado A (essencial pendente)'),
    );

    expect(mockCapturarProps).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'com.instagram.android',
        appLabel: 'Instagram',
      }),
    );
    const { snapshotJson } = mockCapturarProps.mock.calls[0][0];
    expect(JSON.parse(snapshotJson).tarefas).toEqual([
      expect.objectContaining({ essencial: true, concluida: false }),
    ]);
  });

  it('estado B: abre o InterceptRoot com a essencial já concluída', async () => {
    await render(<InterceptDebugScreen />);

    await fireEvent.press(
      screen.getByText('Simular estado B (essencial já cumprido)'),
    );

    const { snapshotJson } = mockCapturarProps.mock.calls[0][0];
    expect(JSON.parse(snapshotJson).tarefas).toEqual([
      expect.objectContaining({ essencial: true, concluida: true }),
    ]);
  });

  it('estado C: abre o InterceptRoot sem nenhuma tarefa', async () => {
    await render(<InterceptDebugScreen />);

    await fireEvent.press(
      screen.getByText('Simular estado C (nenhuma tarefa hoje)'),
    );

    const { snapshotJson } = mockCapturarProps.mock.calls[0][0];
    expect(JSON.parse(snapshotJson).tarefas).toEqual([]);
  });

  it('aoSairOverride volta pra tela de debug (os 3 botões reaparecem)', async () => {
    await render(<InterceptDebugScreen />);

    await fireEvent.press(
      screen.getByText('Simular estado A (essencial pendente)'),
    );
    expect(
      screen.queryByText('Simular estado A (essencial pendente)'),
    ).toBeNull();

    const { aoSairOverride } = mockCapturarProps.mock.calls[0][0] as {
      aoSairOverride: () => void;
    };
    await act(async () => {
      aoSairOverride();
    });

    expect(
      screen.getByText('Simular estado A (essencial pendente)'),
    ).toBeTruthy();
  });
});
