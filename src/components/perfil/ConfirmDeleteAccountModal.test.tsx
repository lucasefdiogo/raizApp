import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConfirmDeleteAccountModal } from './ConfirmDeleteAccountModal';
import { theme } from '../../theme';

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

  it('o botão "Excluir conta" é sóbrio — nem Cobre nem cor de erro/alerta', async () => {
    await render(
      <ConfirmDeleteAccountModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const estilo = StyleSheet.flatten(screen.getByText('Excluir conta').props.style);

    expect(estilo.color).toBe(theme.colors.textSecondary);
    expect(estilo.color).not.toBe(theme.colors.erro);
    expect(estilo.color).not.toBe(theme.colors.accent);
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
