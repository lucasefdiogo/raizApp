import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessoesInfoSheet } from './SessoesInfoSheet';

// Lê useSafeAreaInsets (mesmo padrão de ReflexaoSemanalSheet.test.tsx).
function render(ui: React.ReactElement) {
  return rtlRender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

describe('SessoesInfoSheet', () => {
  it('HU-09 Cenário 6: explica a pausa curta, a sessão, a pausa e o acesso rápido', async () => {
    await render(
      <SessoesInfoSheet
        visible
        duracaoBlocoMin={15}
        cooldownMin={45}
        acessosRapidosDiarios={3}
        onEntendi={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        'Antes de cada sessão, uma pausa curta pergunta o que você vai fazer. Cada sessão dá 15 minutos de uso, contados só com a rede aberta. Depois vem uma pausa de 45 minutos. Durante a pausa, o acesso rápido libera 2 minutos, até 3 vezes por dia.',
      ),
    ).toBeTruthy();
  });

  it('toca em "Entendi" para fechar', async () => {
    const onEntendi = jest.fn();
    await render(
      <SessoesInfoSheet
        visible
        duracaoBlocoMin={15}
        cooldownMin={45}
        acessosRapidosDiarios={3}
        onEntendi={onEntendi}
      />,
    );

    await fireEvent.press(screen.getByText('Entendi'));

    expect(onEntendi).toHaveBeenCalledTimes(1);
  });

  it('visible=false não mostra nada', async () => {
    await render(
      <SessoesInfoSheet
        visible={false}
        duracaoBlocoMin={15}
        cooldownMin={45}
        acessosRapidosDiarios={3}
        onEntendi={jest.fn()}
      />,
    );

    expect(screen.queryByText('Entendi')).toBeNull();
  });
});
