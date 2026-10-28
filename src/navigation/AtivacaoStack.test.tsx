import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AtivacaoStack } from './AtivacaoStack';

jest.mock('../screens/ativacao/AtivacaoConviteScreen', () => ({
  AtivacaoConviteScreen: ({
    aoConfigurar,
    aoPular,
  }: {
    aoConfigurar: () => void;
    aoPular: () => void;
  }) => {
    const { Text, Pressable } = require('react-native');
    return (
      <>
        <Pressable onPress={aoConfigurar}>
          <Text>IR_CONFIGURAR</Text>
        </Pressable>
        <Pressable onPress={aoPular}>
          <Text>IR_PULAR</Text>
        </Pressable>
      </>
    );
  },
}));

jest.mock('../screens/perfil/BloqueioAppsScreen', () => ({
  BloqueioAppsScreen: ({ onVoltar }: { onVoltar: () => void }) => {
    const { Text, Pressable } = require('react-native');
    return (
      <Pressable onPress={onVoltar}>
        <Text>BLOQUEIO_VOLTAR</Text>
      </Pressable>
    );
  },
}));

jest.mock('../screens/perfil/DivulgacaoAcessibilidadeScreen', () => ({
  DivulgacaoAcessibilidadeScreen: () => null,
}));

jest.mock('../screens/perfil/DivulgacaoAcessoUsoScreen', () => ({
  DivulgacaoAcessoUsoScreen: () => null,
}));

function renderStack(onConcluir: () => void) {
  return render(
    <NavigationContainer>
      <AtivacaoStack uid="uid-1" onConcluir={onConcluir} />
    </NavigationContainer>,
  );
}

describe('AtivacaoStack', () => {
  it('voltar de BloqueioApps conclui a ativação em vez de retornar ao convite', async () => {
    const onConcluir = jest.fn();
    await renderStack(onConcluir);

    await fireEvent.press(screen.getByText('IR_CONFIGURAR'));
    expect(screen.getByText('BLOQUEIO_VOLTAR')).toBeTruthy();

    await fireEvent.press(screen.getByText('BLOQUEIO_VOLTAR'));

    expect(onConcluir).toHaveBeenCalled();
    expect(screen.queryByText('IR_CONFIGURAR')).toBeNull();
  });
});
