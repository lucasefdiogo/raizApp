import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SecaoConfig } from './SecaoConfig';

describe('SecaoConfig', () => {
  it('mostra o eyebrow e o conteúdo', async () => {
    await render(
      <SecaoConfig eyebrow="SESSÕES">
        <Text>Conteúdo da seção</Text>
      </SecaoConfig>,
    );

    expect(screen.getByText('SESSÕES')).toBeTruthy();
    expect(screen.getByText('Conteúdo da seção')).toBeTruthy();
  });

  it('sem link: não mostra nenhum link', async () => {
    await render(
      <SecaoConfig eyebrow="QUANDO">
        <Text>Conteúdo</Text>
      </SecaoConfig>,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('com link: mostra o rótulo e chama onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(
      <SecaoConfig eyebrow="SESSÕES" link={{ rotulo: 'Como funciona', onPress }}>
        <Text>Conteúdo</Text>
      </SecaoConfig>,
    );

    expect(screen.getByText('Como funciona')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Como funciona' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
