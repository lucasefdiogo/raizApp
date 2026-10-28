import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AtivacaoConviteScreen } from './AtivacaoConviteScreen';

jest.mock('../../services/analytics');

const { logAtivacaoBloqueioConvite } = require('../../services/analytics');

describe('AtivacaoConviteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('"Configurar bloqueio" chama aoConfigurar e loga configurar', async () => {
    const aoConfigurar = jest.fn();
    await render(
      <AtivacaoConviteScreen aoConfigurar={aoConfigurar} aoPular={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('Configurar bloqueio'));
    expect(aoConfigurar).toHaveBeenCalled();
    expect(logAtivacaoBloqueioConvite).toHaveBeenCalledWith('configurar');
  });

  it('"Agora não" chama aoPular e loga agora_nao', async () => {
    const aoPular = jest.fn();
    await render(
      <AtivacaoConviteScreen aoConfigurar={jest.fn()} aoPular={aoPular} />,
    );
    await fireEvent.press(screen.getByText('Agora não'));
    expect(aoPular).toHaveBeenCalled();
    expect(logAtivacaoBloqueioConvite).toHaveBeenCalledWith('agora_nao');
  });
});
