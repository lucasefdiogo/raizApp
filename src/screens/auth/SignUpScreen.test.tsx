import React from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SignUpScreen } from './SignUpScreen';
import {
  URL_POLITICA_PRIVACIDADE,
  URL_TERMOS_DE_USO,
} from '../../config/legalLinks';

function renderComNavegacao(signUp: jest.Mock) {
  return render(
    <NavigationContainer>
      <SignUpScreen signUp={signUp} />
    </NavigationContainer>,
  );
}

describe('SignUpScreen', () => {
  it('mantém o botão Criar conta desabilitado com campos vazios', async () => {
    const signUp = jest.fn();
    await renderComNavegacao(signUp);

    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(signUp).not.toHaveBeenCalled();
  });

  it('mostra erro e não chama signUp quando as senhas não coincidem', async () => {
    const signUp = jest.fn();
    await renderComNavegacao(signUp);

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'a@a.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'senha123');
    await fireEvent.changeText(
      screen.getByLabelText('Confirmar senha'),
      'outraSenha',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByText('As senhas não coincidem')).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('chama signUp quando as senhas coincidem', async () => {
    const signUp = jest.fn().mockResolvedValueOnce(undefined);
    await renderComNavegacao(signUp);

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'a@a.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'senha123');
    await fireEvent.changeText(
      screen.getByLabelText('Confirmar senha'),
      'senha123',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(signUp).toHaveBeenCalledWith('a@a.com', 'senha123');
  });

  it('mostra a mensagem de erro mapeada quando signUp falha', async () => {
    const signUp = jest
      .fn()
      .mockRejectedValueOnce(
        new Error('Esse e-mail já tem uma conta. Entrar em vez de cadastrar?'),
      );
    await renderComNavegacao(signUp);

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'a@a.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'senha123');
    await fireEvent.changeText(
      screen.getByLabelText('Confirmar senha'),
      'senha123',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByText(
        'Esse e-mail já tem uma conta. Entrar em vez de cadastrar?',
      ),
    ).toBeTruthy();
  });

  it('mostra o botão de voltar (pro Entrar)', async () => {
    await renderComNavegacao(jest.fn());

    const botaoVoltar = screen.getByLabelText('Voltar');
    expect(botaoVoltar).toBeTruthy();
    await fireEvent.press(botaoVoltar);
  });

  it('não mostra botão do Google nesta tela', async () => {
    await renderComNavegacao(jest.fn());
    expect(screen.queryByText('Continuar com Google')).toBeNull();
  });

  describe('links legais', () => {
    beforeEach(() => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('mostra o texto de consentimento com os dois links', async () => {
      await renderComNavegacao(jest.fn());

      expect(
        screen.getByText(/Ao criar sua conta, você concorda/),
      ).toBeTruthy();
      expect(screen.getByText('Política de Privacidade')).toBeTruthy();
      expect(screen.getByText('Termos de Uso')).toBeTruthy();
    });

    it('tocar em "Política de Privacidade" abre a URL da política', async () => {
      await renderComNavegacao(jest.fn());

      await fireEvent.press(screen.getByText('Política de Privacidade'));

      expect(Linking.openURL).toHaveBeenCalledWith(URL_POLITICA_PRIVACIDADE);
    });

    it('tocar em "Termos de Uso" abre a URL dos termos', async () => {
      await renderComNavegacao(jest.fn());

      await fireEvent.press(screen.getByText('Termos de Uso'));

      expect(Linking.openURL).toHaveBeenCalledWith(URL_TERMOS_DE_USO);
    });
  });
});
