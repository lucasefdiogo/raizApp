import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StreakMilestoneModal } from './StreakMilestoneModal';

describe('StreakMilestoneModal', () => {
  it('renderiza o número do marco e o corpo recebido via prop', async () => {
    await render(
      <StreakMilestoneModal
        marco={7}
        corpo="Uma semana inteira sustentando o combinado com você mesmo."
        visible={true}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('dias seguidos')).toBeTruthy();
    expect(
      screen.getByText(
        'Uma semana inteira sustentando o combinado com você mesmo.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Marco atingido')).toBeTruthy();
  });

  it('chama onDismiss ao tocar em Continuar', async () => {
    const onDismiss = jest.fn();
    await render(
      <StreakMilestoneModal
        marco={3}
        corpo="Três dias já é sinal de que algo mudou."
        visible={true}
        onDismiss={onDismiss}
      />,
    );

    await fireEvent.press(screen.getByText('Continuar'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('não mostra o corpo quando a prop vem vazia', async () => {
    await render(
      <StreakMilestoneModal
        marco={14}
        corpo=""
        visible={true}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText('14')).toBeTruthy();
  });
});
