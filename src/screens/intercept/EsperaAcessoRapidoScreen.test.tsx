import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { EsperaAcessoRapidoScreen } from './EsperaAcessoRapidoScreen';

async function montar(
  sobrescritas: Partial<React.ComponentProps<typeof EsperaAcessoRapidoScreen>> = {},
) {
  const props = {
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    esperaSeg: 5,
    onLiberado: jest.fn(),
    onVoltarAoInicio: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<EsperaAcessoRapidoScreen {...props} />);
  return { props, ...resultado };
}

// setTimeout em cadeia (não setInterval) — precisa avançar segundo a segundo
// pra cada efeito reagendar o próximo antes do avanço seguinte.
async function passar(segundos: number) {
  for (let i = 0; i < segundos; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('HU-11 RN09 · EsperaAcessoRapidoScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('Cenário 11: mostra "ACESSO RÁPIDO", "Liberando 2 minutos" e a contagem de 5 segundos', async () => {
    await montar({ esperaSeg: 5 });

    expect(screen.getByText('ACESSO RÁPIDO')).toBeTruthy();
    expect(screen.getByText('Liberando 2 minutos')).toBeTruthy();
    expect(screen.getByText('5 s')).toBeTruthy();
  });

  it('ao zerar, chama onLiberado automaticamente', async () => {
    const { props } = await montar({ esperaSeg: 2 });

    await passar(2);

    expect(props.onLiberado).toHaveBeenCalledTimes(1);
  });

  it('a contagem desce a cada segundo', async () => {
    await montar({ esperaSeg: 5 });

    await passar(2);

    expect(screen.getByText('3 s')).toBeTruthy();
  });

  it('Cenário 12: com rotina confirmada e dentro da janela, mostra a frase noturna e a alternativa', async () => {
    await montar({
      esperaSeg: 30,
      mensagemNoturna: 'O descanso de hoje é o foco de amanhã.',
      alternativa: 'Ler um pouco',
      onAlternativa: jest.fn(),
    });

    expect(screen.getByText('30 s')).toBeTruthy();
    expect(screen.getByText('O descanso de hoje é o foco de amanhã.')).toBeTruthy();
    expect(screen.queryByText('Liberando 2 minutos')).toBeNull();
    expect(screen.getByText('Ler um pouco em vez disso')).toBeTruthy();
  });

  it('tocar na alternativa chama onAlternativa sem chamar onLiberado', async () => {
    const onAlternativa = jest.fn();
    const { props } = await montar({
      mensagemNoturna: 'Uma mensagem.',
      alternativa: 'Ler um pouco',
      onAlternativa,
    });

    await fireEvent.press(screen.getByText('Ler um pouco em vez disso'));

    expect(onAlternativa).toHaveBeenCalledTimes(1);
    expect(props.onLiberado).not.toHaveBeenCalled();
  });

  it('"Sair" cancela sem chamar onLiberado', async () => {
    const { props } = await montar({ esperaSeg: 30 });

    await fireEvent.press(screen.getByText('Sair'));

    expect(props.onVoltarAoInicio).toHaveBeenCalledTimes(1);
    expect(props.onLiberado).not.toHaveBeenCalled();
  });

  it('mostra o botão mesmo sem mensagemNoturna, quando alternativa e onAlternativa são informados', async () => {
    await montar({ alternativa: 'Ler um pouco', onAlternativa: jest.fn() });

    expect(screen.getByText('Ler um pouco em vez disso')).toBeTruthy();
  });
});
