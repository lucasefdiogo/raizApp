import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MomentoFocoInterceptScreen } from './MomentoFocoInterceptScreen';

jest.mock('../../native/AccessibilityDetection', () => ({
  abrirRootora: jest.fn().mockResolvedValue(undefined),
  encerrarMomentoFocoNaInterceptacao: jest.fn(),
  irParaTelaInicial: jest.fn().mockResolvedValue(undefined),
}));

const { abrirRootora, encerrarMomentoFocoNaInterceptacao, irParaTelaInicial } =
  require('../../native/AccessibilityDetection');

describe('MomentoFocoInterceptScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => undefined);
  });

  it('volta para o Rootora sem encerrar o momento', async () => {
    await render(<MomentoFocoInterceptScreen fimEm={Date.now() + 120_000} />);
    await fireEvent.press(screen.getByText('Voltar à tarefa'));
    await waitFor(() => expect(abrirRootora).toHaveBeenCalledTimes(1));
    expect(encerrarMomentoFocoNaInterceptacao).not.toHaveBeenCalled();
  });

  it('encerra a proteção e sai para a tela inicial', async () => {
    await render(<MomentoFocoInterceptScreen fimEm={Date.now() + 120_000} />);
    await fireEvent.press(screen.getByText('Encerrar momento de foco'));
    await waitFor(() => expect(irParaTelaInicial).toHaveBeenCalledTimes(1));
    expect(encerrarMomentoFocoNaInterceptacao).toHaveBeenCalledTimes(1);
  });

  it('fecha a interceptação quando o prazo do momento termina', async () => {
    jest.useFakeTimers();
    const fimEm = Date.now() + 2_000;
    await render(<MomentoFocoInterceptScreen fimEm={fimEm} />);
    await act(async () => { jest.advanceTimersByTime(2_000); });
    expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
