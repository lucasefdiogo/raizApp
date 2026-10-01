import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DivulgacaoAcessibilidadeScreen } from './DivulgacaoAcessibilidadeScreen';

jest.mock('../../hooks/useConsentimentoAcessibilidade');

const {
  useConsentimentoAcessibilidade,
} = require('../../hooks/useConsentimentoAcessibilidade');

describe('DivulgacaoAcessibilidadeScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('mostra o título e as 4 frases exatas da divulgação', async () => {
    useConsentimentoAcessibilidade.mockReturnValue({
      concordarEAtivar: jest.fn().mockResolvedValue(true),
    });
    await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={jest.fn()} />);

    expect(screen.getByText('Como o bloqueio funciona')).toBeTruthy();
    expect(
      screen.getByText(
        'Para interceptar um app, o Rootora usa o serviço de acessibilidade do Android.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Ele identifica apenas qual app foi aberto, para mostrar sua tarefa do dia no lugar dele.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Não lê o que você digita e não vê o conteúdo das telas.'),
    ).toBeTruthy();
    expect(
      screen.getByText('O Rootora registra quais apps foram interceptados e quando.'),
    ).toBeTruthy();
    expect(screen.getByText('Concordo e quero ativar')).toBeTruthy();
    expect(screen.getByText('Agora não')).toBeTruthy();
  });

  it('"Concordo e quero ativar" chama concordarEAtivar e depois onVoltar', async () => {
    const concordarEAtivar = jest.fn().mockResolvedValue(true);
    const onVoltar = jest.fn();
    useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
    await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

    await fireEvent.press(screen.getByText('Concordo e quero ativar'));

    expect(concordarEAtivar).toHaveBeenCalledTimes(1);
    expect(onVoltar).toHaveBeenCalledTimes(1);
  });

  it('"Agora não" chama só onVoltar, sem concordarEAtivar', async () => {
    const concordarEAtivar = jest.fn().mockResolvedValue(true);
    const onVoltar = jest.fn();
    useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
    await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

    await fireEvent.press(screen.getByText('Agora não'));

    expect(onVoltar).toHaveBeenCalledTimes(1);
    expect(concordarEAtivar).not.toHaveBeenCalled();
  });

  it('se concordarEAtivar falhar (resolve false), fica na tela em vez de voltar', async () => {
    const concordarEAtivar = jest.fn().mockResolvedValue(false);
    const onVoltar = jest.fn();
    useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
    await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

    await fireEvent.press(screen.getByText('Concordo e quero ativar'));

    expect(concordarEAtivar).toHaveBeenCalledTimes(1);
    expect(onVoltar).not.toHaveBeenCalled();
  });
});
