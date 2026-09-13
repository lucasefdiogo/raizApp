import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SecondaryButton } from './SecondaryButton';
import { theme } from '../theme';

describe('SecondaryButton', () => {
  it('mostra o título recebido', async () => {
    await render(<SecondaryButton titulo="Voltar" onPress={jest.fn()} />);
    expect(screen.getByText('Voltar')).toBeTruthy();
  });

  it('chama onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(<SecondaryButton titulo="Voltar" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Voltar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado: não chama onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(
      <SecondaryButton titulo="Voltar" onPress={onPress} desabilitado />,
    );

    await fireEvent.press(screen.getByText('Voltar'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('tratamento neutro: borda e texto em Terra Suave — nunca Musgo nem Cobre', async () => {
    await render(<SecondaryButton titulo="Voltar" onPress={jest.fn()} />);

    const texto = screen.getByText('Voltar');
    const botao = texto.parent!;
    const estiloTexto = StyleSheet.flatten(texto.props.style);
    const estiloBotao = StyleSheet.flatten(botao.props.style);

    expect(estiloTexto.color).toBe(theme.colors.terraSuave);
    expect(estiloBotao.borderColor).toBe(theme.colors.terraSuave);
    expect(estiloTexto.color).not.toBe(theme.colors.musgo);
    expect(estiloBotao.borderColor).not.toBe(theme.colors.musgo);
    expect(estiloTexto.color).not.toBe(theme.colors.accent);
    expect(estiloBotao.borderColor).not.toBe(theme.colors.accent);
  });

  it('desabilitado: continua visualmente distinto do estado habilitado', async () => {
    await render(
      <SecondaryButton titulo="Voltar" onPress={jest.fn()} desabilitado />,
    );

    const texto = screen.getByText('Voltar');
    const botao = texto.parent!;
    const estiloTexto = StyleSheet.flatten(texto.props.style);
    const estiloBotao = StyleSheet.flatten(botao.props.style);

    expect(estiloTexto.color).not.toBe(theme.colors.terraSuave);
    expect(estiloBotao.borderColor).not.toBe(theme.colors.terraSuave);
  });
});
