import React from 'react';
import { render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RecoveryStateScreen } from './RecoveryStateScreen';

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

describe('RecoveryStateScreen — bloqueio do botão voltar', () => {
  it('registra o bloqueio do hardwareBackPress ao montar em foco', async () => {
    const addEventListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);

    await renderEmStack(
      <RecoveryStateScreen
        tipo="escudo"
        corpo="A proteção cobriu o dia de ontem."
        onConcluir={jest.fn()}
      />,
    );

    expect(addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    addEventListener.mockRestore();
  });
});
