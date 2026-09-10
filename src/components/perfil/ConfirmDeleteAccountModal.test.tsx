import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConfirmDeleteAccountModal } from './ConfirmDeleteAccountModal';

describe('ConfirmDeleteAccountModal', () => {
  it('mostra título e corpo de aviso quando visível', async () => {
    await render(
      <ConfirmDeleteAccountModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText('Excluir sua conta')).toBeTruthy();
    expect(
      screen.getByText(
        'Isso apaga sua conta e todo o seu progresso de forma permanente. Não é possível desfazer.',
      ),
    ).toBeTruthy();
  });

  it('chama onCancel ao tocar em "Cancelar" e não chama onConfirm', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDeleteAccountModal
        visible
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('chama onConfirm ao tocar em "Excluir conta"', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDeleteAccountModal
        visible
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await fireEvent.press(screen.getByText('Excluir conta'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('não renderiza o conteúdo quando visible é false', async () => {
    await render(
      <ConfirmDeleteAccountModal
        visible={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByText('Excluir sua conta')).toBeNull();
  });
});
