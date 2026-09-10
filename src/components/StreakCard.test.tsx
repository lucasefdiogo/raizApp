import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StreakCard } from './StreakCard';

const streakBase = {
  streakAtual: 4,
  escudosDisponiveis: 1,
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

  it('mostra a quantidade de proteções disponíveis', async () => {
    await render(<StreakCard streak={streakBase} />);
    expect(screen.getByText('1 proteção disponível')).toBeTruthy();
  });

  it('usa plural quando há mais de uma proteção', async () => {
    await render(
      <StreakCard streak={{ ...streakBase, escudosDisponiveis: 2 }} />,
    );
    expect(screen.getByText('2 proteções disponíveis')).toBeTruthy();
  });
});
