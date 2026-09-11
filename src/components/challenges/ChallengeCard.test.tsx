import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ChallengeCard } from './ChallengeCard';

function larguraBarra() {
  return StyleSheet.flatten(
    screen.getByTestId('challenge-card-barra').props.style,
  ).width;
}

describe('ChallengeCard', () => {
  it('ativo: mostra título, "X de Y" e a barra proporcional, sem mensagem de status', async () => {
    await render(
      <ChallengeCard
        titulo="Exercite-se 3x essa semana"
        progresso={2}
        meta={3}
        status="ativo"
      />,
    );

    expect(screen.getByText('Exercite-se 3x essa semana')).toBeTruthy();
    expect(screen.getByText('2 de 3')).toBeTruthy();
    expect(larguraBarra()).toBe(`${(2 / 3) * 100}%`);
    expect(screen.queryByText('Concluído.')).toBeNull();
    expect(
      screen.queryByText('Essa rodada não fechou — a próxima já começou.'),
    ).toBeNull();
  });

  it('concluído: barra cheia e rótulo "Concluído."', async () => {
    await render(
      <ChallengeCard
        titulo="Cumpra sua essencial todo dia"
        progresso={7}
        meta={7}
        status="concluido"
      />,
    );

    expect(screen.getByText('7 de 7')).toBeTruthy();
    expect(larguraBarra()).toBe('100%');
    expect(screen.getByText('Concluído.')).toBeTruthy();
  });

  it('expirado: mensagem calma, sem tom de cobrança', async () => {
    await render(
      <ChallengeCard
        titulo="20 dias ativos esse mês"
        progresso={12}
        meta={20}
        status="expirado"
      />,
    );

    expect(screen.getByText('12 de 20')).toBeTruthy();
    expect(
      screen.getByText('Essa rodada não fechou — a próxima já começou.'),
    ).toBeTruthy();
  });

  it('não estoura a barra se progresso passar da meta', async () => {
    await render(
      <ChallengeCard titulo="X" progresso={5} meta={3} status="concluido" />,
    );
    expect(larguraBarra()).toBe('100%');
  });
});
