import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StreakCard } from './StreakCard';
import { Streak } from '../domain/types';

const streakBase: Streak = {
  streakAtual: 4,
  diasTotaisAtivos: 11,
  escudosDisponiveis: 1,
  marcosAtingidos: [3],
  ultimoDiaAtivo: '2026-09-08',
  statusStreak: 'ativo',
};

describe('StreakCard', () => {
  it('mostra o valor atual do streak', async () => {
    await render(<StreakCard streak={streakBase} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('dias seguidos')).toBeTruthy();
  });

  it('usa singular quando o streak é 1', async () => {
    await render(<StreakCard streak={{ ...streakBase, streakAtual: 1 }} />);
    expect(screen.getByText('dia seguido')).toBeTruthy();
  });

  it('mostra a quantidade de escudos disponíveis', async () => {
    await render(<StreakCard streak={streakBase} />);
    expect(screen.getByText('1 escudo disponível')).toBeTruthy();
  });

  it('usa plural quando há mais de um escudo', async () => {
    await render(
      <StreakCard streak={{ ...streakBase, escudosDisponiveis: 2 }} />,
    );
    expect(screen.getByText('2 escudos disponíveis')).toBeTruthy();
  });
});
