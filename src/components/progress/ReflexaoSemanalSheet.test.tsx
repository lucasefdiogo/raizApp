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

  const PROPOSTA = {
    titulo: 'Até 5h 40min nas redes',
    linha: 'Cerca de 40 min a menos que a semana passada. Pequeno de propósito.',
    metaSegundos: 20400,
    baseSegundos: 22800,
  };

  it('com proposta, mostra o bloco no lugar de Entendi/Agora não', async () => {
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        proposta={PROPOSTA}
        onEntendi={jest.fn()}
        onAgoraNao={jest.fn()}
        onAceitarProposta={jest.fn()}
      />,
    );

    expect(screen.getByText('PROPOSTA PARA ESTA SEMANA')).toBeTruthy();
    expect(screen.getByText('Até 5h 40min nas redes')).toBeTruthy();
    expect(
      screen.getByText('Cerca de 40 min a menos que a semana passada. Pequeno de propósito.'),
    ).toBeTruthy();
    expect(screen.getByText('Aceitar')).toBeTruthy();
    expect(screen.getByText('Agora não')).toBeTruthy();
    expect(screen.queryByText('Entendi')).toBeNull();
  });

  it('"Aceitar" chama onAceitarProposta, não onEntendi', async () => {
    const onAceitarProposta = jest.fn();
    const onEntendi = jest.fn();
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        proposta={PROPOSTA}
        onEntendi={onEntendi}
        onAgoraNao={jest.fn()}
        onAceitarProposta={onAceitarProposta}
      />,
    );

    await fireEvent.press(screen.getByText('Aceitar'));

    expect(onAceitarProposta).toHaveBeenCalledTimes(1);
    expect(onEntendi).not.toHaveBeenCalled();
  });

  it('sem proposta, continua mostrando Entendi/Agora não como antes', async () => {
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        onEntendi={jest.fn()}
        onAgoraNao={jest.fn()}
      />,
    );

    expect(screen.getByText('Entendi')).toBeTruthy();
    expect(screen.queryByText('PROPOSTA PARA ESTA SEMANA')).toBeNull();
  });

  it('com resultadoAnteriorTexto, mostra a frase acima do título', async () => {
    await render(
      <ReflexaoSemanalSheet
        visible
        dados={DADOS}
        resultadoAnteriorTexto="Você fechou a semana passada dentro do combinado."
        onEntendi={jest.fn()}
        onAgoraNao={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Você fechou a semana passada dentro do combinado.'),
    ).toBeTruthy();
  });
});
