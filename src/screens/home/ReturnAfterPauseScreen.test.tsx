import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import { BackHandler, Keyboard, ScrollView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReturnAfterPauseScreen } from './ReturnAfterPauseScreen';

jest.mock('../../hooks/useReturnAfterPause');
const { useReturnAfterPause } = require('../../hooks/useReturnAfterPause');

const Stack = createNativeStackNavigator();

function renderEmStack(ui: React.ReactElement) {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Teste">{() => ui}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('ReturnAfterPauseScreen — bloqueio do botão voltar', () => {
  beforeEach(() => {
    useReturnAfterPause.mockReturnValue({
      porqueTexto: 'Terminar meus estudos',
      corpoComTexto: 'Alguns dias passaram, e tudo bem.',
      carregando: false,
      enviarTarefaInicial: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('registra o bloqueio do hardwareBackPress ao montar em foco', async () => {
    const addEventListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);

    await renderEmStack(
      <ReturnAfterPauseScreen uid="uid-teste" onConcluir={jest.fn()} />,
    );

    expect(addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    addEventListener.mockRestore();
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
        screen.getByTestId('return-after-pause-scroll').props
          .contentContainerStyle,
      ).paddingBottom;

    try {
      await renderEmStack(
        <ReturnAfterPauseScreen uid="uid-teste" onConcluir={jest.fn()} />,
      );

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
});
