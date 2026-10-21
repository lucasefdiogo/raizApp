import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PausaIntencaoScreen } from './PausaIntencaoScreen';

async function montar(sobrescritas: Partial<React.ComponentProps<typeof PausaIntencaoScreen>> = {}) {
  const props = {
    appLabel: 'Instagram',
    duracaoSeg: 5,
    saldo: null as number | null,
    onLiberar: jest.fn(),
    onAgoraNao: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<PausaIntencaoScreen {...props} />);
  return { props, ...resultado };
}

describe('PausaIntencaoScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('CA-01: estado normal mostra o campo de intenção e o botão Liberar desabilitado durante a pausa', async () => {
    await montar({ duracaoSeg: 10 });

    expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
    expect(screen.getByLabelText('Se quiser, escreva (opcional)')).toBeTruthy();
    const botao = screen.getByRole('button', { name: 'Liberar em 10s' });
    expect(botao.props.accessibilityState?.disabled).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(9000);
    });
    expect(
      screen.getByRole('button', { name: 'Liberar em 1s' }).props.accessibilityState?.disabled,
    ).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(
      screen.getByRole('button', { name: 'Liberar' }).props.accessibilityState?.disabled,
    ).toBeFalsy();
  });

  it('CA-04: estado normal da segunda sessão mantém o Liberar desabilitado por 20 segundos', async () => {
    await montar({ duracaoSeg: 20 });

    expect(
      screen.getByRole('button', { name: 'Liberar em 20s' }).props.accessibilityState?.disabled,
    ).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(19000);
    });
    expect(
      screen.getByRole('button', { name: 'Liberar em 1s' }).props.accessibilityState?.disabled,
    ).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(
      screen.getByRole('button', { name: 'Liberar' }).props.accessibilityState?.disabled,
    ).toBeFalsy();
  });

  it('mostra a pergunta, o campo opcional e o botão desabilitado com a contagem', async () => {
    await montar({ duracaoSeg: 10 });

    expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
    expect(screen.getByLabelText('Se quiser, escreva (opcional)')).toBeTruthy();
    const botao = screen.getByRole('button', { name: 'Liberar em 10s' });
    expect(botao.props.accessibilityState?.disabled).toBe(true);
  });

  it('a contagem desce a cada segundo e habilita o botão ao zerar', async () => {
    await montar({ duracaoSeg: 3 });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Liberar em 1s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    const botao = screen.getByRole('button', { name: 'Liberar' });
    expect(botao.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('tocar em "Liberar" antes de zerar não chama onLiberar', async () => {
    const { props } = await montar({ duracaoSeg: 5 });

    await fireEvent.press(screen.getByText('Liberar em 5s'));

    expect(props.onLiberar).not.toHaveBeenCalled();
  });

  it('depois de zerar, "Liberar" entrega o texto digitado (ou vazio)', async () => {
    const { props } = await montar({ duracaoSeg: 1 });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await fireEvent.press(screen.getByText('Liberar'));
    expect(props.onLiberar).toHaveBeenLastCalledWith('');

    await fireEvent.changeText(
      screen.getByLabelText('Se quiser, escreva (opcional)'),
      'responder um amigo',
    );
    await fireEvent.press(screen.getByText('Liberar'));
    expect(props.onLiberar).toHaveBeenLastCalledWith('responder um amigo');
  });

  it('"Agora não" funciona a qualquer momento', async () => {
    const { props } = await montar({ duracaoSeg: 60 });

    await fireEvent.press(screen.getByText('Agora não'));

    expect(props.onAgoraNao).toHaveBeenCalledTimes(1);
  });

  it('remontar reinicia a contagem (sair da tela e voltar)', async () => {
    const primeira = await montar({ duracaoSeg: 5 });
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Liberar em 1s')).toBeTruthy();

    await primeira.unmount();
    await montar({ duracaoSeg: 5 });

    expect(screen.getByText('Liberar em 5s')).toBeTruthy();
  });

  it('sem limite diário (saldo null) não fala em sessões restantes', async () => {
    await montar({ saldo: null });
    expect(screen.queryByText(/Rest/)).toBeNull();
    expect(screen.getByText(/Um respiro antes de abrir o Instagram/)).toBeTruthy();
  });

  it('com limite numérico mostra o saldo restante no singular e no plural, sem exclamação', async () => {
    const um = await montar({ saldo: 1 });
    expect(screen.getByText(/Resta 1 sessão hoje/)).toBeTruthy();
    await um.unmount();

    await montar({ saldo: 3 });
    expect(screen.getByText(/Restam 3 sessões hoje/)).toBeTruthy();
    expect(screen.queryByText(/!/)).toBeNull();
  });
});
