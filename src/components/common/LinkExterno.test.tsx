import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { LinkExterno } from './LinkExterno';

describe('LinkExterno', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderiza o conteúdo recebido e expõe role de link', async () => {
    await render(
      <LinkExterno url="https://exemplo.test/x">Abrir algo</LinkExterno>,
    );

    const link = screen.getByText('Abrir algo');
    expect(link).toBeTruthy();
    expect(link.props.accessibilityRole).toBe('link');
  });

  it('abre a URL no navegador do dispositivo ao tocar', async () => {
    await render(
      <LinkExterno url="https://exemplo.test/privacidade">
        Política
      </LinkExterno>,
    );

    await fireEvent.press(screen.getByText('Política'));

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://exemplo.test/privacidade',
    );
  });

  it('não propaga erro se o dispositivo não conseguir abrir a URL', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no browser'));

    await render(
      <LinkExterno url="https://exemplo.test/x">Abrir</LinkExterno>,
    );

    expect(() => fireEvent.press(screen.getByText('Abrir'))).not.toThrow();
  });
});
