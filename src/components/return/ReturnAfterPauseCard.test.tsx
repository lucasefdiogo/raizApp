import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReturnAfterPauseCard } from './ReturnAfterPauseCard';

describe('ReturnAfterPauseCard', () => {
  it('mostra o corpo do sistema e o porquê destacado separadamente', async () => {
    await render(
      <ReturnAfterPauseCard
        corpoComTexto="Alguns dias passaram, e tudo bem. O que importa é o próximo passo."
        porqueTexto="Terminar meus estudos"
        onSubmit={jest.fn()}
        carregando={false}
        erro={null}
      />,
    );

    expect(
      screen.getByText(
        'Alguns dias passaram, e tudo bem. O que importa é o próximo passo.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('“Terminar meus estudos”')).toBeTruthy();
  });

  it('campo vazio: mostra erro inline e não chama onSubmit', async () => {
    const onSubmit = jest.fn();
    await render(
      <ReturnAfterPauseCard
        corpoComTexto="corpo"
        porqueTexto="porquê"
        onSubmit={onSubmit}
        carregando={false}
        erro={null}
      />,
    );

    await fireEvent.press(screen.getByText('Voltar a começar'));

    expect(
      screen.getByText('Escreva 1 coisa pequena antes de continuar'),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('campo preenchido: chama onSubmit com o valor digitado', async () => {
    const onSubmit = jest.fn();
    await render(
      <ReturnAfterPauseCard
        corpoComTexto="corpo"
        porqueTexto="porquê"
        onSubmit={onSubmit}
        carregando={false}
        erro={null}
      />,
    );

    await fireEvent.changeText(
      screen.getByPlaceholderText('ex: guardar o celular na gaveta às 20h'),
      'Guardar o celular na gaveta às 20h',
    );
    await fireEvent.press(screen.getByText('Voltar a começar'));

    expect(onSubmit).toHaveBeenCalledWith('Guardar o celular na gaveta às 20h');
    expect(
      screen.queryByText('Escreva 1 coisa pequena antes de continuar'),
    ).toBeNull();
  });

  it('exibe o erro externo (ex: falha de rede) recebido via prop', async () => {
    await render(
      <ReturnAfterPauseCard
        corpoComTexto="corpo"
        porqueTexto="porquê"
        onSubmit={jest.fn()}
        carregando={false}
        erro="Não deu pra salvar agora. Tenta de novo em instantes."
      />,
    );

    expect(
      screen.getByText('Não deu pra salvar agora. Tenta de novo em instantes.'),
    ).toBeTruthy();
  });
});
