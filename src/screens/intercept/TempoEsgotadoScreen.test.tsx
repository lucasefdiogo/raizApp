import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TempoEsgotadoScreen } from './TempoEsgotadoScreen';

async function montar(podeTolerancia: boolean) {
  const props = {
    toleranciaMin: 2,
    podeTolerancia,
    onTolerancia: jest.fn(),
    onAgoraNao: jest.fn(),
  };
  const resultado = await render(<TempoEsgotadoScreen {...props} />);
  return { props, ...resultado };
}

describe('TempoEsgotadoScreen', () => {
  it('com tolerância disponível: "Tempo esgotado", "+2 min para finalizar" e "Agora não"', async () => {
    const { props } = await montar(true);

    expect(screen.getByText('Tempo esgotado')).toBeTruthy();
    await fireEvent.press(screen.getByText('+2 min para finalizar'));
    expect(props.onTolerancia).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText('Agora não'));
    expect(props.onAgoraNao).toHaveBeenCalledTimes(1);
  });

  it('o valor da tolerância vem da config', async () => {
    await render(
      <TempoEsgotadoScreen
        toleranciaMin={5}
        podeTolerancia
        onTolerancia={jest.fn()}
        onAgoraNao={jest.fn()}
      />,
    );
    expect(screen.getByText('+5 min para finalizar')).toBeTruthy();
  });

  it('sem tolerância (já usada): sem o botão de +min, só "Sair"', async () => {
    const { props } = await montar(false);

    expect(screen.queryByText(/para finalizar/)).toBeNull();
    await fireEvent.press(screen.getByText('Sair'));
    expect(props.onAgoraNao).toHaveBeenCalledTimes(1);
  });
});
