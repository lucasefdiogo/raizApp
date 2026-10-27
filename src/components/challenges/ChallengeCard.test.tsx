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

  it('variante teto: mostra a duração formatada e os dias restantes em vez de "X de Y"', async () => {
    await render(
      <ChallengeCard
        titulo="Até 5h 40min nas redes esta semana"
        progresso={3600} meta={20400} status="ativo"
        variante="teto" diasRestantesTexto="4 dias restantes"
      />,
    );

    expect(screen.getByText('1h de 5h 40min')).toBeTruthy();
    expect(screen.getByText('4 dias restantes')).toBeTruthy();
  });

  it('variante teto, ultrapassou: barra cheia e a frase de ultrapassagem, sem Concluído nem cor de erro', async () => {
    await render(
      <ChallengeCard
        titulo="Até 5h 40min nas redes esta semana"
        progresso={21600} meta={20400} status="ativo"
        variante="teto" diasRestantesTexto="1 dia restante" ultrapassou
      />,
    );

    expect(larguraBarra()).toBe('100%');
    expect(screen.getByText('Passou do combinado desta semana. Na segunda tem outra proposta.')).toBeTruthy();
    expect(screen.queryByText('Concluído.')).toBeNull();
  });

  it('variante teto, sem medição: mostra a frase de interrupção', async () => {
    await render(
      <ChallengeCard
        titulo="Até 5h 40min nas redes esta semana"
        progresso={3600} meta={20400} status="ativo"
        variante="teto" diasRestantesTexto="2 dias restantes" semMedicaoDesde="quarta-feira"
      />,
    );

    expect(screen.getByText('Sem medição desde quarta-feira')).toBeTruthy();
  });

  it('variante piso (default) continua igual a antes', async () => {
    await render(<ChallengeCard titulo="Exercite-se 3x essa semana" progresso={2} meta={3} status="ativo" />);
    expect(screen.getByText('2 de 3')).toBeTruthy();
  });
});
