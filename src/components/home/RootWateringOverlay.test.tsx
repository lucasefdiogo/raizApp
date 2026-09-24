import React from 'react';
import { Animated } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RootWateringOverlay } from './RootWateringOverlay';

describe('RootWateringOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('não renderiza nada quando visible é false', async () => {
    await render(
      <RootWateringOverlay
        visible={false}
        diasSequencia={5}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('root-watering-overlay')).toBeNull();
  });

  it('mostra a mensagem principal e a submensagem recebida', async () => {
    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={5}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={jest.fn()}
      />,
    );

    expect(screen.getByText('A raiz recebeu hoje.')).toBeTruthy();
    expect(screen.getByText('Mais um passo real.')).toBeTruthy();
  });

  it('barra de progresso: mostra "{N} dias" e "próximo ramo em {X}" calculados do próximo marco', async () => {
    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={5} // próximo marco: 7 -> faltam 2
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={jest.fn()}
      />,
    );

    expect(screen.getByText('5 dias')).toBeTruthy();
    expect(screen.getByText('próximo ramo em 2')).toBeTruthy();
  });

  it('barra de progresso: usa singular "dia" quando diasSequencia é 1', async () => {
    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={1}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={jest.fn()}
      />,
    );

    expect(screen.getByText('1 dia')).toBeTruthy();
  });

  it('depois do marco final (90+): não mostra a barra de progresso (não há próximo marco)', async () => {
    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={95}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={jest.fn()}
      />,
    );

    expect(screen.queryByText(/próximo ramo em/)).toBeNull();
  });

  describe('linha de desbloqueio', () => {
    it('sem apps configurados no bloqueio: NÃO renderiza a linha (nem placeholder)', async () => {
      await render(
        <RootWateringOverlay
          visible={true}
          diasSequencia={5}
          submensagem="Mais um passo real."
          appsDesbloqueados={[]}
          onHide={jest.fn()}
        />,
      );

      expect(screen.queryByTestId('root-watering-desbloqueio')).toBeNull();
      expect(screen.queryByText(/acesso liberado/)).toBeNull();
    });

    it('com apps configurados: mostra "✓ acesso liberado · {nomes}"', async () => {
      await render(
        <RootWateringOverlay
          visible={true}
          diasSequencia={5}
          submensagem="Mais um passo real."
          appsDesbloqueados={['Instagram', 'TikTok']}
          onHide={jest.fn()}
        />,
      );

      expect(
        screen.getByText('✓ acesso liberado · Instagram, TikTok'),
      ).toBeTruthy();
    });
  });

  it('auto-dismiss: chama onHide uma única vez depois de 3s, não antes', async () => {
    const onHide = jest.fn();
    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={5}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={onHide}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(2999);
    });
    expect(onHide).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('toque em qualquer lugar do overlay chama onHide antes dos 3s', async () => {
    const onHide = jest.fn();
    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={5}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={onHide}
      />,
    );

    await fireEvent.press(screen.getByTestId('root-watering-overlay'));

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('cancela o auto-dismiss pendente se desmontar antes da hora', async () => {
    const onHide = jest.fn();
    const { unmount } = await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={5}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={onHide}
      />,
    );

    await act(async () => {
      unmount();
    });
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(onHide).not.toHaveBeenCalled();
  });

  it('sequência de animação: ponto desce (0-400ms), caule pulsa Cobre->Musgo (400-900ms), conteúdo entra a partir de 900ms — nessa ordem', async () => {
    const timingSpy = jest.spyOn(Animated, 'timing');

    await render(
      <RootWateringOverlay
        visible={true}
        diasSequencia={5}
        submensagem="Mais um passo real."
        appsDesbloqueados={[]}
        onHide={jest.fn()}
      />,
    );

    const configuracoes = timingSpy.mock.calls.map(([, config]) => config);
    expect(configuracoes.length).toBeGreaterThanOrEqual(4);
    const [primeiro, segundo, terceiro, quarto] = configuracoes;

    // 1º estágio: o ponto desce nos primeiros 400ms.
    expect(primeiro).toMatchObject({ toValue: 1, duration: 400 });
    // 2º e 3º: o pulso do caule sobe e desce logo em seguida (400-900ms).
    expect(segundo).toMatchObject({ toValue: 1, duration: 250 });
    expect(terceiro).toMatchObject({ toValue: 0, duration: 250 });
    // 4º: o conteúdo final só começa a entrar depois dos dois primeiros
    // estágios (delay >= 400 + 500).
    expect(quarto).toMatchObject({ toValue: 1, delay: 900 });
    expect(quarto?.delay).toBeGreaterThanOrEqual(
      (primeiro?.duration ?? 0) + (segundo?.duration ?? 0) + (terceiro?.duration ?? 0),
    );
  });
});
