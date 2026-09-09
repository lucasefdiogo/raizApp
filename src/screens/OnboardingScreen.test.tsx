import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OnboardingScreen } from './OnboardingScreen';

describe('OnboardingScreen', () => {
  it('bloqueia o avanço até o texto do porquê ter tamanho mínimo', async () => {
    await render(<OnboardingScreen onConcluir={jest.fn()} />);

    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Por que você quer estar aqui')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText('Seu porquê pessoal'),
      'Quero terminar meus estudos',
    );
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText('Onde a procrastinação mais aparece')).toBeTruthy();
  });

  it('chama onConcluir ao terminar os três passos', async () => {
    const onConcluir = jest.fn();
    await render(<OnboardingScreen onConcluir={onConcluir} />);

    await fireEvent.changeText(
      screen.getByLabelText('Seu porquê pessoal'),
      'Quero terminar meus estudos',
    );
    await fireEvent.press(screen.getByText('Continuar'));

    await fireEvent.press(screen.getByText('Estudos'));
    await fireEvent.press(screen.getByText('Continuar'));

    await fireEvent.press(screen.getByText('4h'));
    await fireEvent.press(screen.getByText('Concluir'));

    expect(onConcluir).toHaveBeenCalled();
  });
});
