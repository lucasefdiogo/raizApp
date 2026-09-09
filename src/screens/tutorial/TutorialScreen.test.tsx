import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TutorialScreen } from './TutorialScreen';

describe('TutorialScreen', () => {
  it('mostra o primeiro slide e não os demais antes de avançar', async () => {
    await render(<TutorialScreen onConcluir={jest.fn()} />);

    expect(screen.getByText('Isso te parece familiar?')).toBeTruthy();
    expect(
      screen.queryByText('Você escolhe até 3 tarefas essenciais por dia. Elas contam. O resto é bônus.'),
    ).toBeNull();
    expect(screen.queryByText('Vamos começar pequeno.')).toBeNull();
  });

  it('avança os slides em ordem ao pressionar Continuar', async () => {
    await render(<TutorialScreen onConcluir={jest.fn()} />);

    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Tarefas pequenas.\nSem cobrança.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuar'));
    expect(
      screen.getByText('Um ramo fica mais fino.\nA raiz continua firme.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Vamos começar pequeno.')).toBeTruthy();
    expect(screen.getByText('Começar')).toBeTruthy();
    expect(screen.getByText('Já tenho conta')).toBeTruthy();
  });

  it('chama onConcluir ao pular a partir do primeiro slide', async () => {
    const onConcluir = jest.fn();
    await render(<TutorialScreen onConcluir={onConcluir} />);

    await fireEvent.press(screen.getByText('pular'));
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  it('chama onConcluir ao pressionar "Começar" no último slide', async () => {
    const onConcluir = jest.fn();
    await render(<TutorialScreen onConcluir={onConcluir} />);

    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Começar'));

    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  it('chama onConcluir ao pressionar "Já tenho conta" no último slide', async () => {
    const onConcluir = jest.fn();
    await render(<TutorialScreen onConcluir={onConcluir} />);

    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Já tenho conta'));

    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  it('não mostra "pular" no último slide', async () => {
    await render(<TutorialScreen onConcluir={jest.fn()} />);

    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.queryByText('pular')).toBeNull();
  });
});
