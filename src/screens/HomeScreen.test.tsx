import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('mostra a mensagem de dia pendente antes de qualquer tarefa concluída', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('O dia ainda está começando.')).toBeTruthy();
  });

  it('mostra a mensagem de dia cumprido ao concluir a tarefa essencial', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    );
    expect(screen.getByText('Dia cumprido. Isso já conta.')).toBeTruthy();
  });
});
