import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeatureTourOverlay } from './FeatureTourOverlay';

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
});
