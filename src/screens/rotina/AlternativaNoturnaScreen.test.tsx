import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Keyboard, ScrollView, StyleSheet } from 'react-native';
import { AlternativaNoturnaScreen } from './AlternativaNoturnaScreen';

async function montar() {
  const onSalvar = jest.fn();
  const onAgoraNao = jest.fn();
  await render(
    <AlternativaNoturnaScreen onSalvar={onSalvar} onAgoraNao={onAgoraNao} />,
  );
  return { onSalvar, onAgoraNao };
}

describe('HU-10 RN11 · AlternativaNoturnaScreen', () => {
  it('Cenário 9: toca no chip "Ler um pouco" e Salvar entrega o texto escrito', async () => {
    const { onSalvar } = await montar();

    await fireEvent.press(screen.getByText('Ler um pouco'));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).toHaveBeenCalledWith('Ler um pouco');
  });

  it('mostra os 4 chips de sugestão', async () => {
    await montar();

    expect(screen.getByText('Ler um pouco')).toBeTruthy();
    expect(screen.getByText('Preparar o dia de amanhã')).toBeTruthy();
    expect(screen.getByText('Alongar')).toBeTruthy();
    expect(screen.getByText('Escrever 3 linhas')).toBeTruthy();
  });

  it('o campo tem limite de 40 caracteres', async () => {
    await montar();

    expect(screen.getByLabelText('Alternativa noturna (opcional)').props.maxLength).toBe(
      40,
    );
  });

  it('Cenário 11: Salvar fica desabilitado com o campo vazio', async () => {
    await montar();

    expect(
      screen.getByRole('button', { name: 'Salvar' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('Salvar fica desabilitado com o campo só de espaços', async () => {
    const { onSalvar } = await montar();

    await fireEvent.changeText(
      screen.getByLabelText('Alternativa noturna (opcional)'),
      '   ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('Salvar habilita com texto e entrega sem espaços nas pontas', async () => {
    const { onSalvar } = await montar();

    await fireEvent.changeText(
      screen.getByLabelText('Alternativa noturna (opcional)'),
      '  Ler um pouco  ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).toHaveBeenCalledWith('Ler um pouco');
  });

  it('quando o teclado abre, cria espaço no fim do conteúdo e rola até lá', async () => {
    const ouvintes: Record<string, (evento: unknown) => void> = {};
    const addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      evento: string,
      cb: (e: unknown) => void,
    ) => {
      ouvintes[evento] = cb;
      return { remove: jest.fn() };
    }) as never);
    const scrollToEnd = jest
      .spyOn(ScrollView.prototype, 'scrollToEnd')
      .mockImplementation(() => {});

    const paddingBottomAtual = () =>
      StyleSheet.flatten(
        screen.getByTestId('alternativa-noturna-scroll').props
          .contentContainerStyle,
      ).paddingBottom;

    try {
      await montar();

      expect(paddingBottomAtual()).toBeUndefined();

      await act(async () => {
        ouvintes.keyboardDidShow?.({ endCoordinates: { height: 280 } });
      });

      expect(paddingBottomAtual()).toBeGreaterThanOrEqual(280);

      await waitFor(() =>
        expect(scrollToEnd).toHaveBeenCalledWith({ animated: true }),
      );

      await act(async () => {
        ouvintes.keyboardDidHide?.({});
      });

      expect(paddingBottomAtual()).toBeUndefined();
    } finally {
      addListener.mockRestore();
      scrollToEnd.mockRestore();
    }
  });

  it('CA-03: Agora não dispensa a pergunta sem salvar nada', async () => {
    const { onSalvar, onAgoraNao } = await montar();

    await fireEvent.changeText(
      screen.getByLabelText('Alternativa noturna (opcional)'),
      'Ler um pouco',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));

    expect(onAgoraNao).toHaveBeenCalledTimes(1);
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
