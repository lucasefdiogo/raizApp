import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MainTabNavigator } from './MainTabNavigator';

// As 3 abas montam stacks reais (HojeStack/ProgressoStack/PerfilStack), cada
// uma com sua própria árvore de hooks e dependências — já cobertas nos
// próprios testes. Aqui o que importa é só a navegação entre abas, então
// cada stack é substituída por um marcador simples.
jest.mock('./HojeStack', () => ({
  HojeStack: ({ uid }: { uid: string }) => {
    const { Text } = require('react-native');
    return <Text>HojeStack uid={uid}</Text>;
  },
}));
jest.mock('./ProgressoStack', () => ({
  ProgressoStack: ({ uid }: { uid: string }) => {
    const { Text } = require('react-native');
    return <Text>ProgressoStack uid={uid}</Text>;
  },
}));
jest.mock('./PerfilStack', () => ({
  PerfilStack: ({ uid }: { uid: string }) => {
    const { Text } = require('react-native');
    return <Text>PerfilStack uid={uid}</Text>;
  },
}));

function renderMainTabNavigator(uid = 'uid-teste') {
  return render(
    <NavigationContainer>
      <MainTabNavigator uid={uid} />
    </NavigationContainer>,
  );
}

describe('MainTabNavigator', () => {
  it('começa na aba Hoje, passando o uid certo pro HojeStack', async () => {
    await renderMainTabNavigator();

    expect(screen.getByText('HojeStack uid=uid-teste')).toBeTruthy();
    expect(screen.queryByText('ProgressoStack uid=uid-teste')).toBeNull();
    expect(screen.queryByText('PerfilStack uid=uid-teste')).toBeNull();
  });

  it('mostra as 3 abas na tab bar', async () => {
    await renderMainTabNavigator();

    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Progresso')).toBeTruthy();
    expect(screen.getByText('Perfil')).toBeTruthy();
  });

  it('tocar na aba Progresso troca a tela exibida', async () => {
    await renderMainTabNavigator();

    await fireEvent.press(screen.getByText('Progresso'));

    expect(screen.getByText('ProgressoStack uid=uid-teste')).toBeTruthy();
    expect(screen.queryByText('HojeStack uid=uid-teste')).toBeNull();
  });

  it('tocar na aba Perfil troca a tela exibida', async () => {
    await renderMainTabNavigator();

    await fireEvent.press(screen.getByText('Perfil'));

    expect(screen.getByText('PerfilStack uid=uid-teste')).toBeTruthy();
    expect(screen.queryByText('HojeStack uid=uid-teste')).toBeNull();
  });

  it('voltar pra aba Hoje depois de trocar de aba mostra o HojeStack de novo', async () => {
    await renderMainTabNavigator();

    await fireEvent.press(screen.getByText('Progresso'));
    await fireEvent.press(screen.getByText('Hoje'));

    expect(screen.getByText('HojeStack uid=uid-teste')).toBeTruthy();
  });
});
