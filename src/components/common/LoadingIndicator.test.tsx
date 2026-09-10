import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LoadingIndicator } from './LoadingIndicator';

describe('LoadingIndicator', () => {
  it('usa "Carregando" como label padrão', async () => {
    await render(<LoadingIndicator variant="inline" />);
    expect(screen.getByText('Carregando')).toBeTruthy();
  });

  it('renderiza o label recebido por prop', async () => {
    await render(
      <LoadingIndicator variant="inline" label="Calculando seu progresso" />,
    );
    expect(screen.getByText('Calculando seu progresso')).toBeTruthy();
    expect(screen.queryByText('Carregando')).toBeNull();
  });

  it('expõe o label na acessibilidade e marca role de progresso', async () => {
    await render(<LoadingIndicator variant="fullscreen" label="Carregando" />);
    const el = screen.getByTestId('loading-indicator');
    expect(el.props.accessibilityLabel).toBe('Carregando');
    expect(el.props.accessibilityRole).toBe('progressbar');
  });

  it('mostra o ícone de raiz do app (mesma assinatura visual)', async () => {
    await render(<LoadingIndicator variant="fullscreen" />);
    expect(screen.getByTestId('root-progress-icon')).toBeTruthy();
  });

  it("variante 'fullscreen' ocupa a tela inteira com o fundo da marca", async () => {
    await render(<LoadingIndicator variant="fullscreen" />);
    const estilo = StyleSheet.flatten(
      screen.getByTestId('loading-indicator').props.style,
    );
    expect(estilo.flex).toBe(1);
    expect(estilo.backgroundColor).toBe('#F8F3E9');
  });

  it("variante 'inline' não ocupa a tela inteira nem pinta fundo", async () => {
    await render(<LoadingIndicator variant="inline" />);
    const estilo = StyleSheet.flatten(
      screen.getByTestId('loading-indicator').props.style,
    );
    expect(estilo.flex).toBeUndefined();
    expect(estilo.backgroundColor).toBeUndefined();
  });
});
