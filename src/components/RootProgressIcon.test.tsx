import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RootProgressIcon } from './RootProgressIcon';

describe('RootProgressIcon', () => {
  it('variant completo: ramo variável com traço e opacidade normais', async () => {
    await render(<RootProgressIcon variant="completo" />);

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(4);
    expect(ramo.props.strokeOpacity).toBe(1);
  });

  it('variant reduzido: ramo mais fino e translúcido', async () => {
    await render(<RootProgressIcon variant="reduzido" />);

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(2);
    expect(ramo.props.strokeOpacity).toBe(0.35);
  });

  it('variant escudo: ramo com largura normal, mas translúcido — distinto de reduzido', async () => {
    await render(<RootProgressIcon variant="escudo" />);

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(4);
    expect(ramo.props.strokeOpacity).toBe(0.5);
  });

  it('variant broto: só o ponto de crescimento e um traço curto — sem ramificações', async () => {
    await render(<RootProgressIcon variant="broto" />);

    // tem o ponto de crescimento em Cobre
    expect(screen.getByTestId('root-progress-icon-ponto')).toBeTruthy();
    // e NÃO tem o ramo variável que todas as outras variantes têm
    expect(screen.queryByTestId('root-progress-icon-ramo-variavel')).toBeNull();
  });

  it('reduzido e escudo não têm o ponto de crescimento (broto é distinto delas)', async () => {
    const { rerender } = await render(<RootProgressIcon variant="reduzido" />);
    expect(screen.queryByTestId('root-progress-icon-ponto')).toBeNull();

    rerender(<RootProgressIcon variant="escudo" />);
    expect(screen.queryByTestId('root-progress-icon-ponto')).toBeNull();
  });
});
