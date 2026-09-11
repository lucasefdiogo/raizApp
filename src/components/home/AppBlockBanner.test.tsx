import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppBlockBanner } from './AppBlockBanner';

describe('AppBlockBanner', () => {
  it('mostra o eyebrow, o corpo e o botão de configurar', async () => {
    await render(
      <AppBlockBanner onConfigurar={jest.fn()} onDispensar={jest.fn()} />,
    );

    expect(screen.getByText('Novo · Bloqueio de apps')).toBeTruthy();
    expect(
      screen.getByText(
        'Use suas tarefas do dia para desbloquear Instagram, TikTok e outros apps que mais tiram seu foco.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Configurar agora')).toBeTruthy();
  });

  it('chama onConfigurar ao tocar em "Configurar agora"', async () => {
    const onConfigurar = jest.fn();
    await render(
      <AppBlockBanner onConfigurar={onConfigurar} onDispensar={jest.fn()} />,
    );

    await fireEvent.press(screen.getByText('Configurar agora'));

    expect(onConfigurar).toHaveBeenCalledTimes(1);
  });

  it('chama onDispensar ao tocar no X', async () => {
    const onDispensar = jest.fn();
    await render(
      <AppBlockBanner onConfigurar={jest.fn()} onDispensar={onDispensar} />,
    );

    await fireEvent.press(screen.getByLabelText('Dispensar'));

    expect(onDispensar).toHaveBeenCalledTimes(1);
  });
});
