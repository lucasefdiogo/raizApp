import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { RespiracaoEmergenciaScreen } from './RespiracaoEmergenciaScreen';

jest.mock('../../hooks/useVoltarFisico', () => ({
  useVoltarFisico: jest.fn(),
}));

const { useVoltarFisico } = require('../../hooks/useVoltarFisico');

async function montar(
  sobrescritas: Partial<React.ComponentProps<typeof RespiracaoEmergenciaScreen>> = {},
) {
  const props = {
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    duracaoSeg: 60,
    onConcluir: jest.fn(),
    onCancelar: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<RespiracaoEmergenciaScreen {...props} />);
  return { props, ...resultado };
}

async function passar(segundos: number) {
  for (let i = 0; i < segundos; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('HU-11 RN12 · RespiracaoEmergenciaScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    useVoltarFisico.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('Cenário 15: mostra o eyebrow, "Inspire" no início, a contagem de 60s e o rodapé sem como pular', async () => {
    await montar();

    expect(screen.getByText('SAÍDA DE EMERGÊNCIA')).toBeTruthy();
    expect(screen.getByText('Inspire')).toBeTruthy();
    expect(screen.getByText('1:00')).toBeTruthy();
    expect(screen.getByText('Esta pausa não tem como pular.')).toBeTruthy();
    expect(
      screen.getByText('Acompanhe o círculo. No fim, o Instagram fica liberado por 2 minutos.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Sair')).toBeNull();
  });

  it('alterna entre "Inspire" e "Solte o ar" a cada 5 segundos', async () => {
    await montar();
    expect(screen.getByText('Inspire')).toBeTruthy();

    await passar(5);
    expect(screen.getByText('Solte o ar')).toBeTruthy();

    await passar(5);
    expect(screen.getByText('Inspire')).toBeTruthy();
  });

  it('ao fim dos 60s, chama onConcluir automaticamente', async () => {
    const { props } = await montar({ duracaoSeg: 3 });

    await passar(3);

    expect(props.onConcluir).toHaveBeenCalledTimes(1);
  });

  it('HU-11 RN12: o voltar físico cancela sem chamar onConcluir', async () => {
    const { props } = await montar();

    const handler = useVoltarFisico.mock.calls[0][0];
    await act(async () => {
      handler();
    });

    expect(props.onCancelar).toHaveBeenCalledTimes(1);
    expect(props.onConcluir).not.toHaveBeenCalled();
  });

  it('Cenário 16: com "reduzir movimento" ativo, o círculo não anima — só a contagem e o texto mudam', async () => {
    const loopSpy = jest.spyOn(Animated, 'loop');
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
    await montar();
    await act(async () => {});

    expect(loopSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Inspire')).toBeTruthy();
    expect(screen.getByText('1:00')).toBeTruthy();
  });

  it('sem "reduzir movimento", o círculo anima em loop', async () => {
    const loopSpy = jest.spyOn(Animated, 'loop');
    await montar();
    await act(async () => {});

    expect(loopSpy).toHaveBeenCalledTimes(1);
  });
});
