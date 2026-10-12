import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EsperaBloqueioScreen } from './EsperaBloqueioScreen';

async function montar(
  sobrescritas: Partial<React.ComponentProps<typeof EsperaBloqueioScreen>> = {},
) {
  const props = {
    appLabel: 'Instagram',
    variante: 'cooldown' as const,
    restanteMs: 30 * 60_000,
    saldo: 2,
    blocoPorTarefaExtra: 1,
    onSessaoFoco: jest.fn(),
    onTarefasExtras: jest.fn(),
    onSair: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<EsperaBloqueioScreen {...props} />);
  return { props, ...resultado };
}

describe('EsperaBloqueioScreen', () => {
  it('cooldown: contagem regressiva e saldo guardado', async () => {
    await montar({ restanteMs: 90_000, saldo: 3 });

    expect(screen.getByText('Próximo bloco em')).toBeTruthy();
    expect(screen.getByTestId('espera-contagem').props.children).toBe('01:30');
    expect(screen.getByText('Você tem 3 blocos guardados para depois.')).toBeTruthy();
  });

  it('cooldown com 1 bloco: singular', async () => {
    await montar({ saldo: 1 });
    expect(screen.getByText('Você tem 1 bloco guardado para depois.')).toBeTruthy();
  });

  it('saldo zerado: bloqueio até amanhã e a regra das tarefas extras, sem contagem', async () => {
    await montar({ variante: 'zerado', saldo: 0, blocoPorTarefaExtra: 2 });

    expect(screen.getByText('Os blocos de hoje acabaram')).toBeTruthy();
    expect(
      screen.getByText(/volta a ficar disponível amanhã.*rende 2 blocos/),
    ).toBeTruthy();
    expect(screen.queryByTestId('espera-contagem')).toBeNull();
  });

  it('os três atalhos disparam seus callbacks', async () => {
    const { props } = await montar();

    await fireEvent.press(screen.getByText('Iniciar uma sessão de foco'));
    await fireEvent.press(screen.getByText('Ver tarefas extras'));
    await fireEvent.press(screen.getByText('Sair'));

    expect(props.onSessaoFoco).toHaveBeenCalledTimes(1);
    expect(props.onTarefasExtras).toHaveBeenCalledTimes(1);
    expect(props.onSair).toHaveBeenCalledTimes(1);
  });

  it('nenhum texto com ponto de exclamação', async () => {
    await montar();
    expect(screen.queryByText(/!/)).toBeNull();
  });
});
