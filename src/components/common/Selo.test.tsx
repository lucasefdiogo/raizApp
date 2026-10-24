import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Selo } from './Selo';
import { theme } from '../../theme';

describe('Selo', () => {
  it('ativo: mostra o texto em Musgo', async () => {
    await render(<Selo texto="ATIVO" ativo />);

    expect(screen.getByText('ATIVO')).toBeTruthy();
    const estiloTexto = StyleSheet.flatten(screen.getByText('ATIVO').props.style);
    expect(estiloTexto.color).toBe(theme.colors.musgo);
  });

  it('inativo: mostra o texto em Terra Suave, não Musgo', async () => {
    await render(<Selo texto="DESATIVADO" ativo={false} />);

    const estiloTexto = StyleSheet.flatten(screen.getByText('DESATIVADO').props.style);
    expect(estiloTexto.color).toBe(theme.colors.terraSuave);
    expect(estiloTexto.color).not.toBe(theme.colors.musgo);
  });
});
