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
});
