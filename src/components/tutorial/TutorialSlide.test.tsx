import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TutorialSlide } from './TutorialSlide';

describe('TutorialSlide', () => {
  it('renderiza título, corpo e botão primário a partir das props', async () => {
    const onPress = jest.fn();
    await render(
      <TutorialSlide
        passoAtual={0}
        totalPassos={4}
        titulo="Título do slide"
        corpo={<Text>Conteúdo do corpo</Text>}
        botaoPrimario={{ titulo: 'Continuar', onPress }}
      />,
    );

    expect(screen.getByText('Título do slide')).toBeTruthy();
    expect(screen.getByText('Conteúdo do corpo')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renderiza o eyebrow e o rodapé quando fornecidos', async () => {
    await render(
      <TutorialSlide
        passoAtual={2}
        totalPassos={4}
        eyebrow="Um rótulo"
        titulo="Título"
        rodape="Texto de rodapé"
        botaoPrimario={{ titulo: 'Continuar', onPress: jest.fn() }}
      />,
    );

    expect(screen.getByText('Um rótulo')).toBeTruthy();
    expect(screen.getByText('Texto de rodapé')).toBeTruthy();
  });

  it('não renderiza botão secundário nem "pular" quando não fornecidos', async () => {
    await render(
      <TutorialSlide
        passoAtual={0}
        totalPassos={4}
        titulo="Título"
        botaoPrimario={{ titulo: 'Continuar', onPress: jest.fn() }}
      />,
    );

    expect(screen.queryByText('pular')).toBeNull();
  });

  it('renderiza e aciona o botão secundário e o "pular" quando fornecidos', async () => {
    const onPular = jest.fn();
    const onSecundario = jest.fn();
    await render(
      <TutorialSlide
        passoAtual={3}
        totalPassos={4}
        titulo="Título"
        botaoPrimario={{ titulo: 'Começar', onPress: jest.fn() }}
        botaoSecundario={{ titulo: 'Já tenho conta', onPress: onSecundario }}
        onPular={onPular}
      />,
    );

    await fireEvent.press(screen.getByText('Já tenho conta'));
    expect(onSecundario).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('pular'));
    expect(onPular).toHaveBeenCalledTimes(1);
  });
});
