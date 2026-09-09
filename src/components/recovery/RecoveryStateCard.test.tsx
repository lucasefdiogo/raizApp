import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RecoveryStateCard } from './RecoveryStateCard';

describe('RecoveryStateCard', () => {
  it('tipo escudo: renderiza o ícone na variante escudo e o corpo recebido', async () => {
    await render(
      <RecoveryStateCard
        tipo="escudo"
        corpo="O escudo cobriu o dia de ontem por você."
      />,
    );

    expect(screen.getByText('Escudo ativado')).toBeTruthy();
    expect(
      screen.getByText('O escudo cobriu o dia de ontem por você.'),
    ).toBeTruthy();

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(4);
    expect(ramo.props.strokeOpacity).toBe(0.5);
  });

  it('tipo reduzido: renderiza o ícone na variante reduzido e o corpo recebido', async () => {
    await render(
      <RecoveryStateCard
        tipo="reduzido"
        corpo="O streak caiu, mas continua de pé."
      />,
    );

    expect(screen.getByText('Streak reduzido')).toBeTruthy();
    expect(
      screen.getByText('O streak caiu, mas continua de pé.'),
    ).toBeTruthy();

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(2);
    expect(ramo.props.strokeOpacity).toBe(0.35);
  });
});
