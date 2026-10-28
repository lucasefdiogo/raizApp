import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnboardingStepPrimeiraTarefa } from './OnboardingStepPrimeiraTarefa';

describe('OnboardingStepPrimeiraTarefa', () => {
  it('com foco redes_sociais, mostra o headline e os chips da HU-07', async () => {
    await render(
      <OnboardingStepPrimeiraTarefa
        valor=""
        onAlterar={jest.fn()}
        foco="redes_sociais"
      />,
    );
    expect(
      screen.getByText('O que você vai fazer no lugar da rolagem hoje?'),
    ).toBeTruthy();
    expect(screen.getByText('Ler 10 páginas')).toBeTruthy();
    expect(screen.getByText('Caminhar 15 min')).toBeTruthy();
    expect(screen.getByText('Alongar 5 min')).toBeTruthy();
    expect(screen.getByText('Arrumar a mesa')).toBeTruthy();
  });

  it('tocar um chip chama onAlterar com o texto do chip', async () => {
    const onAlterar = jest.fn();
    await render(
      <OnboardingStepPrimeiraTarefa
        valor=""
        onAlterar={onAlterar}
        foco="redes_sociais"
      />,
    );
    await fireEvent.press(screen.getByText('Ler 10 páginas'));
    expect(onAlterar).toHaveBeenCalledWith('Ler 10 páginas');
  });

  it.each(['estudos', 'trabalho', 'organizacao_pessoal', 'outro', null] as const)(
    'com foco %s, não mostra os chips nem o headline de rolagem',
    async foco => {
      await render(
        <OnboardingStepPrimeiraTarefa valor="" onAlterar={jest.fn()} foco={foco} />,
      );
      expect(screen.queryByText('Ler 10 páginas')).toBeNull();
      expect(
        screen.queryByText('O que você vai fazer no lugar da rolagem hoje?'),
      ).toBeNull();
    },
  );
});
