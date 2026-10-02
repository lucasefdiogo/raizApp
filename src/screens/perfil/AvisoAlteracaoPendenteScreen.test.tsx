import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AvisoAlteracaoPendenteScreen } from './AvisoAlteracaoPendenteScreen';

describe('AvisoAlteracaoPendenteScreen', () => {
  it('mostra o título, a explicação e os dois resumos (hoje/amanhã)', async () => {
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="1 app selecionado, seg, ter, qua, qui, sex das 09:00 às 18:00."
        resumoNovo="Nenhum app bloqueado."
        onConfirmar={jest.fn()}
        onRevisar={jest.fn()}
      />,
    );

    expect(screen.getByText('A mudança vale a partir de amanhã')).toBeTruthy();
    expect(
      screen.getByText(
        'Se a vontade de soltar o bloqueio apareceu agora, isso é só o momento falando — não precisa se cobrar por isso.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        '1 app selecionado, seg, ter, qua, qui, sex das 09:00 às 18:00.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Nenhum app bloqueado.')).toBeTruthy();
  });

  it('"Entendi, confirmar" chama onConfirmar', async () => {
    const onConfirmar = jest.fn();
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="Nenhum app bloqueado."
        resumoNovo="Nenhum app bloqueado."
        onConfirmar={onConfirmar}
        onRevisar={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByText('Entendi, confirmar'));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('"Voltar e revisar" chama onRevisar, sem confirmar', async () => {
    const onConfirmar = jest.fn();
    const onRevisar = jest.fn();
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="Nenhum app bloqueado."
        resumoNovo="Nenhum app bloqueado."
        onConfirmar={onConfirmar}
        onRevisar={onRevisar}
      />,
    );

    await fireEvent.press(screen.getByText('Voltar e revisar'));

    expect(onRevisar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
