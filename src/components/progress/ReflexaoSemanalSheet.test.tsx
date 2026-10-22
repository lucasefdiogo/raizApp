import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReflexaoSemanalSheet } from './ReflexaoSemanalSheet';
import { ReflexaoSemanalDados } from '../../domain/resumoRedes';

// Lê useSafeAreaInsets (mesmo padrão de DayDetailSheet.test.tsx).
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

const DADOS: ReflexaoSemanalDados = {
  periodoLabel: 'Semana de 13 a 19 de out',
  duracaoTotal: '6h 40min',
  appPrincipalTexto: 'O Instagram ficou com mais da metade.',
  mediaPorDia: '57 min',
  diaMaisLongoAbreviado: 'qui',
  totalAberturas: 42,
};

describe('HU-08 · ReflexaoSemanalSheet', () => {
  it('Cenário 12: mostra total, média, dia mais longo e aberturas, sem proposta de desafio ou meta', async () => {
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        onEntendi={jest.fn()}
        onAgoraNao={jest.fn()}
      />,
    );

    expect(screen.getByText('Sua semana nas redes')).toBeTruthy();
    expect(screen.getByText('Semana de 13 a 19 de out')).toBeTruthy();
    expect(screen.getByText(/6h 40min no total\./)).toBeTruthy();
    expect(screen.getByText(/O Instagram ficou com mais da metade\./)).toBeTruthy();
    expect(screen.getByText('57 min')).toBeTruthy();
    expect(screen.getByText('qui')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();

    expect(screen.queryByText(/desafio/i)).toBeNull();
    expect(screen.queryByText(/\bmeta\b/i)).toBeNull();
  });

  it('"Entendi" chama onEntendi', async () => {
    const onEntendi = jest.fn();
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        onEntendi={onEntendi}
        onAgoraNao={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByText('Entendi'));

    expect(onEntendi).toHaveBeenCalledTimes(1);
  });

  it('"Agora não" chama onAgoraNao', async () => {
    const onAgoraNao = jest.fn();
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        onEntendi={jest.fn()}
        onAgoraNao={onAgoraNao}
      />,
    );

    await fireEvent.press(screen.getByText('Agora não'));

    expect(onAgoraNao).toHaveBeenCalledTimes(1);
  });

  it('sem app principal, mostra só o total', async () => {
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={{ ...DADOS, appPrincipalTexto: null }}
        onEntendi={jest.fn()}
        onAgoraNao={jest.fn()}
      />,
    );

    expect(screen.getByText('6h 40min no total.')).toBeTruthy();
  });
});
