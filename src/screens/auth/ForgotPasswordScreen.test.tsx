import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

function renderComNavegacao(resetPassword: jest.Mock) {
  return render(
    <NavigationContainer>
      <ForgotPasswordScreen resetPassword={resetPassword} />
    </NavigationContainer>,
  );
}

describe('ForgotPasswordScreen', () => {
  it('mantém o botão de envio desabilitado com o e-mail vazio', async () => {
    const resetPassword = jest.fn();
    await renderComNavegacao(resetPassword);

    await fireEvent.press(screen.getByText('Enviar link de recuperação'));

    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('mostra a mensagem neutra após o envio, sem confirmar se o e-mail existe', async () => {
    const resetPassword = jest.fn().mockResolvedValueOnce(undefined);
    await renderComNavegacao(resetPassword);

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'a@a.com');
    await fireEvent.press(screen.getByText('Enviar link de recuperação'));

    expect(
      await screen.findByText(
        'Se esse e-mail tiver uma conta, você vai receber um link em alguns minutos.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Enviar link de recuperação')).toBeNull();
  });

  it('mostra erro mapeado quando o envio falha por motivo real (não de enumeração)', async () => {
    const resetPassword = jest
      .fn()
      .mockRejectedValueOnce(new Error('Verifique o formato do e-mail'));
    await renderComNavegacao(resetPassword);

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'nao-e-email');
    await fireEvent.press(screen.getByText('Enviar link de recuperação'));

    expect(await screen.findByText('Verifique o formato do e-mail')).toBeTruthy();
  });
});
