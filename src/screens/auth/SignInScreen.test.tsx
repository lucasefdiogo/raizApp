import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SignInScreen } from './SignInScreen';

function renderComNavegacao(signIn: jest.Mock, signInWithGoogle: jest.Mock) {
  return render(
    <NavigationContainer>
      <SignInScreen signIn={signIn} signInWithGoogle={signInWithGoogle} />
    </NavigationContainer>,
  );
}

describe('SignInScreen', () => {
  it('sem aoVoltarParaTutorial: não mostra o botão de voltar', async () => {
    await renderComNavegacao(jest.fn(), jest.fn());

    expect(screen.queryByLabelText('Voltar')).toBeNull();
  });

  it('com aoVoltarParaTutorial: mostra o botão de voltar e chama a prop ao tocar', async () => {
    const aoVoltarParaTutorial = jest.fn();
    await render(
      <NavigationContainer>
        <SignInScreen
          signIn={jest.fn()}
          signInWithGoogle={jest.fn()}
          aoVoltarParaTutorial={aoVoltarParaTutorial}
        />
      </NavigationContainer>,
    );

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(aoVoltarParaTutorial).toHaveBeenCalledTimes(1);
  });

  it('mantém o botão Entrar desabilitado com campos vazios', async () => {
    const signIn = jest.fn();
    await renderComNavegacao(signIn, jest.fn());

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(signIn).not.toHaveBeenCalled();
  });

  it('chama signIn com e-mail e senha preenchidos', async () => {
    const signIn = jest.fn().mockResolvedValueOnce(undefined);
    await renderComNavegacao(signIn, jest.fn());

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'a@a.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'senha123');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(signIn).toHaveBeenCalledWith('a@a.com', 'senha123');
  });

  it('mostra a mensagem de erro mapeada quando signIn falha', async () => {
    const signIn = jest
      .fn()
      .mockRejectedValueOnce(new Error('E-mail ou senha não conferem'));
    await renderComNavegacao(signIn, jest.fn());

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'a@a.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'errada');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha não conferem')).toBeTruthy();
  });

  it('mostra o botão do Google e chama signInWithGoogle ao pressionar', async () => {
    const signInWithGoogle = jest.fn().mockResolvedValueOnce(undefined);
    await renderComNavegacao(jest.fn(), signInWithGoogle);

    const botaoGoogle = screen.getByText('Continuar com Google');
    expect(botaoGoogle).toBeTruthy();

    await fireEvent.press(botaoGoogle);

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});
