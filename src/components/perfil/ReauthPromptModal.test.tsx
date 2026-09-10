import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReauthPromptModal } from './ReauthPromptModal';

const PROPS_BASE = {
  visible: true,
  erro: null,
  carregando: false,
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
};

describe('ReauthPromptModal', () => {
  it('conta e-mail/senha: pede a senha e envia o texto digitado', async () => {
    const onSubmit = jest.fn();
    await render(
      <ReauthPromptModal {...PROPS_BASE} provedor="password" onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Senha'), 'minhaSenha');
    await fireEvent.press(screen.getByText('Confirmar e excluir'));

    expect(onSubmit).toHaveBeenCalledWith('minhaSenha');
  });

  it('conta e-mail/senha: botão fica desabilitado com o campo vazio', async () => {
    const onSubmit = jest.fn();
    await render(
      <ReauthPromptModal {...PROPS_BASE} provedor="password" onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByText('Confirmar e excluir'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('conta Google: não mostra campo de senha e envia sem argumento', async () => {
    const onSubmit = jest.fn();
    await render(
      <ReauthPromptModal
        {...PROPS_BASE}
        provedor="google.com"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByLabelText('Senha')).toBeNull();
    await fireEvent.press(screen.getByText('Entrar com o Google'));

    expect(onSubmit).toHaveBeenCalledWith(undefined);
  });

  it('mostra a mensagem de erro recebida', async () => {
    await render(
      <ReauthPromptModal
        {...PROPS_BASE}
        provedor="password"
        erro="Senha incorreta. Tente de novo."
      />,
    );

    expect(screen.getByText('Senha incorreta. Tente de novo.')).toBeTruthy();
  });

  it('chama onCancel ao tocar em "Cancelar"', async () => {
    const onCancel = jest.fn();
    await render(
      <ReauthPromptModal
        {...PROPS_BASE}
        provedor="password"
        onCancel={onCancel}
      />,
    );

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
