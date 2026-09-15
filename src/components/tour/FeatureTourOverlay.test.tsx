import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import {
  render as rtlRender,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeatureTourOverlay } from './FeatureTourOverlay';

// Insets realistas de um Android edge-to-edge (status bar + barra de
// gestos) — é exatamente o que faltava antes: sem eles, o balão podia
// acabar posicionado atrás da barra de gestos, travando o tour (bug
// reportado em device físico, ver regras de posicionamento no componente).
const MOCK_FRAME = { x: 0, y: 0, width: 360, height: 800 };
const MOCK_INSETS = { top: 40, left: 0, right: 0, bottom: 34 };

// useWindowDimensions() lê Dimensions.get('window') por baixo — não o
// `frame` do SafeAreaProvider (são APIs independentes). Dimensions.set é a
// própria API de teste do react-native pra sobrescrever isso, sem precisar
// mockar o módulo inteiro (que puxaria TurboModules indisponíveis no jest).
beforeEach(() => {
  Dimensions.set({
    window: { ...MOCK_FRAME, scale: 2, fontScale: 1 },
    screen: { ...MOCK_FRAME, scale: 2, fontScale: 1 },
  });
});

function render(ui: React.ReactElement) {
  return rtlRender(
    <SafeAreaProvider initialMetrics={{ frame: MOCK_FRAME, insets: MOCK_INSETS }}>
      {ui}
    </SafeAreaProvider>,
  );
}

describe('FeatureTourOverlay', () => {
  it('mostra o indicador "Passo N de 5" e o texto do passo atual', async () => {
    await render(
      <FeatureTourOverlay
        passoAtual={2}
        totalPassos={5}
        texto="Esse é o nosso maior diferencial: escolha apps pra limitar."
        medida={null}
        onAvancar={jest.fn()}
        onPular={jest.fn()}
      />,
    );

    expect(screen.getByText('Passo 3 de 5')).toBeTruthy();
    expect(
      screen.getByText(
        'Esse é o nosso maior diferencial: escolha apps pra limitar.',
      ),
    ).toBeTruthy();
  });

  it('não é o último passo: mostra "Próximo", não "Concluir"', async () => {
    await render(
      <FeatureTourOverlay
        passoAtual={0}
        totalPassos={5}
        texto="texto qualquer"
        medida={null}
        onAvancar={jest.fn()}
        onPular={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Próximo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Concluir' })).toBeNull();
  });

  it('último passo: mostra "Concluir", não "Próximo"', async () => {
    await render(
      <FeatureTourOverlay
        passoAtual={4}
        totalPassos={5}
        texto="texto qualquer"
        medida={null}
        onAvancar={jest.fn()}
        onPular={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Concluir' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Próximo' })).toBeNull();
  });

  it('"Pular tour" chama onPular, nunca onAvancar', async () => {
    const onPular = jest.fn();
    const onAvancar = jest.fn();
    await render(
      <FeatureTourOverlay
        passoAtual={1}
        totalPassos={5}
        texto="texto qualquer"
        medida={null}
        onAvancar={onAvancar}
        onPular={onPular}
      />,
    );

    await fireEvent.press(screen.getByText('Pular tour'));

    expect(onPular).toHaveBeenCalledTimes(1);
    expect(onAvancar).not.toHaveBeenCalled();
  });

  it('"Próximo"/"Concluir" chama onAvancar, nunca onPular', async () => {
    const onPular = jest.fn();
    const onAvancar = jest.fn();
    await render(
      <FeatureTourOverlay
        passoAtual={1}
        totalPassos={5}
        texto="texto qualquer"
        medida={null}
        onAvancar={onAvancar}
        onPular={onPular}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Próximo' }));

    expect(onAvancar).toHaveBeenCalledTimes(1);
    expect(onPular).not.toHaveBeenCalled();
  });

  it('renderiza sem quebrar quando medida é null (ainda não mediu, ou nada visível no momento)', async () => {
    await render(
      <FeatureTourOverlay
        passoAtual={0}
        totalPassos={5}
        texto="texto qualquer"
        medida={null}
        onAvancar={jest.fn()}
        onPular={jest.fn()}
      />,
    );

    expect(screen.getByTestId('feature-tour-overlay')).toBeTruthy();
  });

  it('com medida definida, renderiza sem quebrar', async () => {
    await render(
      <FeatureTourOverlay
        passoAtual={0}
        totalPassos={5}
        texto="texto qualquer"
        medida={{ x: 20, y: 100, width: 200, height: 80 }}
        onAvancar={jest.fn()}
        onPular={jest.fn()}
      />,
    );

    expect(screen.getByTestId('feature-tour-overlay')).toBeTruthy();
    expect(screen.getByText('texto qualquer')).toBeTruthy();
  });

  // Regressão do bug reportado em device físico: sem descontar
  // useSafeAreaInsets(), o balão podia ficar posicionado atrás da status
  // bar ou da barra de gestos, deixando os controles inacessíveis — como o
  // overlay bloqueia toque no resto da tela, isso travava o tour sem saída.
  describe('respeita a área segura (status bar / barra de gestos)', () => {
    it('alvo colado no topo: o balão nunca começa dentro da área da status bar', async () => {
      await render(
        <FeatureTourOverlay
          passoAtual={0}
          totalPassos={5}
          texto="texto qualquer"
          medida={{ x: 20, y: 10, width: 200, height: 40 }}
          onAvancar={jest.fn()}
          onPular={jest.fn()}
        />,
      );

      const estilo = StyleSheet.flatten(
        screen.getByTestId('feature-tour-balao').props.style,
      );

      expect(estilo.top).toBeGreaterThanOrEqual(MOCK_INSETS.top);
    });

    it('alvo colado na base (ex: aba da tab bar): o balão nunca se estende até a barra de gestos, e os controles continuam presentes e tocáveis', async () => {
      await render(
        <FeatureTourOverlay
          passoAtual={4}
          totalPassos={5}
          texto="texto qualquer"
          medida={{
            x: 20,
            y: MOCK_FRAME.height - 60,
            width: 60,
            height: 50,
          }}
          onAvancar={jest.fn()}
          onPular={jest.fn()}
        />,
      );

      const estilo = StyleSheet.flatten(
        screen.getByTestId('feature-tour-balao').props.style,
      );
      const baseDoBalao = (estilo.top ?? 0) + (estilo.maxHeight ?? 0);

      expect(baseDoBalao).toBeLessThanOrEqual(MOCK_FRAME.height - MOCK_INSETS.bottom);
      expect(screen.getByRole('button', { name: 'Concluir' })).toBeTruthy();
      expect(screen.getByText('Pular tour')).toBeTruthy();
    });

    it('sem medida (fallback centralizado): ainda assim respeita as duas áreas seguras', async () => {
      await render(
        <FeatureTourOverlay
          passoAtual={0}
          totalPassos={5}
          texto="texto qualquer"
          medida={null}
          onAvancar={jest.fn()}
          onPular={jest.fn()}
        />,
      );

      const estilo = StyleSheet.flatten(
        screen.getByTestId('feature-tour-balao').props.style,
      );
      const baseDoBalao = (estilo.top ?? 0) + (estilo.maxHeight ?? 0);

      expect(estilo.top).toBeGreaterThanOrEqual(MOCK_INSETS.top);
      expect(baseDoBalao).toBeLessThanOrEqual(MOCK_FRAME.height - MOCK_INSETS.bottom);
    });
  });
});
