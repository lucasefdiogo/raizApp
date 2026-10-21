import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EsperaBloqueioScreen } from './EsperaBloqueioScreen';

async function montar(
  sobrescritas: Partial<React.ComponentProps<typeof EsperaBloqueioScreen>> = {},
) {
  const props = {
    variante: 'cooldown' as const,
    restanteMs: 45 * 60_000,
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
  it('CA-03: estado erro mostra próximo acesso em 45 min com os atalhos de foco e tarefas extras', async () => {
    const { props } = await montar({ restanteMs: 45 * 60_000 });

    expect(screen.getByText('Próximo acesso em 45 min')).toBeTruthy();
    await fireEvent.press(screen.getByText('Iniciar uma sessão de foco'));
    await fireEvent.press(screen.getByText('Ver tarefas extras'));
    expect(props.onSessaoFoco).toHaveBeenCalledTimes(1);
    expect(props.onTarefasExtras).toHaveBeenCalledTimes(1);
  });

  it('CA-03: o cooldown diminui com o tempo, arredondando os minutos para cima', async () => {
    const { rerender } = await montar({ restanteMs: 44 * 60_000 + 1 });
    expect(screen.getByText('Próximo acesso em 45 min')).toBeTruthy();

    await rerender(
      <EsperaBloqueioScreen
        variante="cooldown"
        restanteMs={90_000}
        blocoPorTarefaExtra={1}
        onSessaoFoco={jest.fn()}
        onTarefasExtras={jest.fn()}
        onSair={jest.fn()}
      />,
    );
    expect(screen.getByText('Próximo acesso em 2 min')).toBeTruthy();
  });

  it('CA-02: o cooldown tem texto acessível por minuto, sem a contagem de segundos', async () => {
    await montar({ restanteMs: 30 * 60_000 + 15_000 });

    const contagem = screen.getByTestId('espera-contagem');
    expect(contagem.props.accessibilityLabel).toBe('Próximo acesso em 31 minutos');
    expect(contagem.props.accessibilityLiveRegion).toBe('polite');
  });

  it('CA-06: saldo zerado mostra os atalhos sem sugerir bloqueio até amanhã', async () => {
    await montar({ variante: 'zerado', blocoPorTarefaExtra: 2 });

    expect(screen.getByText('Você usou as sessões de hoje')).toBeTruthy();
    expect(screen.getByText(/rende 2 sessões/)).toBeTruthy();
    expect(screen.queryByText(/amanhã/)).toBeNull();
    expect(screen.queryByTestId('espera-contagem')).toBeNull();
    expect(screen.getByText('Iniciar uma sessão de foco')).toBeTruthy();
    expect(screen.getByText('Ver tarefas extras')).toBeTruthy();
  });

  it('"Sair" dispara o callback', async () => {
    const { props } = await montar();
    await fireEvent.press(screen.getByText('Sair'));
    expect(props.onSair).toHaveBeenCalledTimes(1);
  });
});
