import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PausaIntencaoScreen } from './PausaIntencaoScreen';

async function montar(sobrescritas: Partial<React.ComponentProps<typeof PausaIntencaoScreen>> = {}) {
  const props = {
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    duracaoSeg: 5,
    duracaoBlocoMin: 15,
    posicaoSessao: 1,
    saldo: null as number | null,
    onLiberar: jest.fn(),
    onAgoraNao: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<PausaIntencaoScreen {...props} />);
  return { props, ...resultado };
}

describe('HU-11 · PausaIntencaoScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('Cenário 2: eyebrow com a posição da sessão, headline e botão com a contagem m:ss', async () => {
    await montar({ posicaoSessao: 3, duracaoSeg: 30 });

    expect(screen.getByText('3ª SESSÃO HOJE')).toBeTruthy();
    expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
    const botao = screen.getByRole('button', { name: 'Liberar em 0:30' });
    expect(botao.props.accessibilityState?.disabled).toBe(true);
  });

  it('Cenário 3: ao zerar, o botão vira "Liberar {duracaoBlocoMin} min" e libera ao tocar', async () => {
    const { props } = await montar({ duracaoSeg: 1, duracaoBlocoMin: 15 });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const botao = screen.getByRole('button', { name: 'Liberar 15 min' });
    expect(botao.props.accessibilityState?.disabled).toBeFalsy();

    await fireEvent.press(botao);
    expect(props.onLiberar).toHaveBeenCalledWith('');
  });

  it('a contagem desce a cada segundo em m:ss', async () => {
    await montar({ duracaoSeg: 65 });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Liberar em 1:02')).toBeTruthy();
  });

  it('Cenário 4: "Voltar ao início" funciona a qualquer momento', async () => {
    const { props } = await montar({ duracaoSeg: 60 });

    await fireEvent.press(screen.getByText('Voltar ao início'));

    expect(props.onAgoraNao).toHaveBeenCalledTimes(1);
  });

  it('remontar reinicia a contagem (sair da tela e voltar)', async () => {
    const primeira = await montar({ duracaoSeg: 5 });
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Liberar em 0:01')).toBeTruthy();

    await primeira.unmount();
    await montar({ duracaoSeg: 5 });

    expect(screen.getByText('Liberar em 0:05')).toBeTruthy();
  });

  it('sem limite diário (saldo null) não fala em sessões restantes', async () => {
    await montar({ saldo: null });
    expect(screen.queryByText(/Rest/)).toBeNull();
  });

  it('com limite numérico mostra o saldo restante no singular e no plural, sem exclamação', async () => {
    const um = await montar({ saldo: 1 });
    expect(screen.getByText(/Resta 1 sessão hoje/)).toBeTruthy();
    await um.unmount();

    await montar({ saldo: 3 });
    expect(screen.getByText(/Restam 3 sessões hoje/)).toBeTruthy();
    expect(screen.queryByText(/!/)).toBeNull();
  });

  describe('variante noturna (HU-06/HU-11 RN05/RN07/RN08)', () => {
    it('Cenário 5: eyebrow, headline em frase noturna e o botão da alternativa', async () => {
      const onAlternativa = jest.fn();
      await montar({
        posicaoSessao: 3,
        mensagemNoturna: 'O descanso de hoje é o foco de amanhã.',
        alternativa: 'Ler um pouco',
        onAlternativa,
        duracaoSeg: 60,
      });

      expect(screen.getByText('JANELA NOTURNA · 3ª SESSÃO')).toBeTruthy();
      expect(screen.getByText('O descanso de hoje é o foco de amanhã.')).toBeTruthy();
      expect(screen.queryByText('O que você vai fazer agora?')).toBeNull();
      expect(screen.getByRole('button', { name: 'Liberar em 1:00' })).toBeTruthy();
      expect(screen.getByText('Ler um pouco em vez disso')).toBeTruthy();
    });

    it('Cenário 6: tocar na alternativa chama onAlternativa sem liberar', async () => {
      const onAlternativa = jest.fn();
      const { props } = await montar({
        mensagemNoturna: 'Uma mensagem.',
        alternativa: 'Ler um pouco',
        onAlternativa,
      });

      await fireEvent.press(screen.getByText('Ler um pouco em vez disso'));

      expect(onAlternativa).toHaveBeenCalledTimes(1);
      expect(props.onLiberar).not.toHaveBeenCalled();
    });

    it('sem alternativa o botão extra não aparece', async () => {
      await montar({ mensagemNoturna: 'Uma mensagem.' });

      expect(screen.queryByText(/em vez disso/)).toBeNull();
    });

    it('sem mensagemNoturna a tela fica no modo padrão, mesmo com alternativa informada', async () => {
      await montar({ alternativa: 'Ler um pouco', onAlternativa: jest.fn() });

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByText(/em vez disso/)).toBeNull();
    });
  });
});
