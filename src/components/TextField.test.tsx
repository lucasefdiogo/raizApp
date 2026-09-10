import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextField } from './TextField';

describe('TextField', () => {
  it('usa o label como texto visível e como rótulo de acessibilidade', async () => {
    await render(<TextField label="E-mail" />);

    expect(screen.getByText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
  });

  it('encaminha value e onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextField label="Nome" value="Ana" onChangeText={onChangeText} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Paula');
    expect(onChangeText).toHaveBeenCalledWith('Ana Paula');
  });

  it('sem multiline: campo de uma linha, sem altura mínima', async () => {
    await render(<TextField label="E-mail" />);

    const input = screen.getByLabelText('E-mail');
    const estilo = StyleSheet.flatten(input.props.style) ?? {};
    expect(input.props.multiline).toBeFalsy();
    expect(estilo.minHeight).toBeUndefined();
  });

  it('com multiline: caixa alta com texto começando no topo (padrão do onboarding)', async () => {
    await render(<TextField label="Seu porquê" multiline />);

    const input = screen.getByLabelText('Seu porquê');
    const estilo = StyleSheet.flatten(input.props.style) ?? {};
    expect(input.props.multiline).toBe(true);
    expect(estilo.minHeight).toBe(120);
    expect(estilo.textAlignVertical).toBe('top');
  });

  it('mostra a mensagem de erro quando recebida', async () => {
    await render(<TextField label="Senha" erro="Senha muito curta" />);
    expect(screen.getByText('Senha muito curta')).toBeTruthy();
  });
});
