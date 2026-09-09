import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

jest.mock('../hooks/useStreak');
const { useStreak } = require('../hooks/useStreak');

beforeEach(() => {
  useStreak.mockReturnValue({
    streakAtual: 4,
    diasTotaisAtivos: 11,
    escudosDisponiveis: 1,
    statusDiaAnterior: null,
    marcoAtingido: null,
    carregando: false,
  });
});

describe('HomeScreen', () => {
  it('mostra a mensagem de dia pendente antes de qualquer tarefa concluída', async () => {
    await render(<HomeScreen uid="uid-teste" />);
    expect(screen.getByText('O dia ainda está começando.')).toBeTruthy();
  });

  it('mostra a mensagem de dia cumprido ao concluir a tarefa essencial', async () => {
    await render(<HomeScreen uid="uid-teste" />);
    await fireEvent.press(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    );
    expect(screen.getByText('Dia cumprido. Isso já conta.')).toBeTruthy();
  });

  it('mostra o streak e os escudos vindos de useStreak', async () => {
    await render(<HomeScreen uid="uid-teste" />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('1 escudo disponível')).toBeTruthy();
  });
});
