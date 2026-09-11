import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MainTabNavigator } from './MainTabNavigator';
import { theme } from '../theme';

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

  it('mostra as 3 abas na tab bar, com a aba ativa em Cobre e as inativas em Terra Suave', async () => {
    await renderMainTabNavigator();

    const hoje = screen.getByText('Hoje');
    const progresso = screen.getByText('Progresso');
    const perfil = screen.getByText('Perfil');

    expect(hoje).toBeTruthy();
    expect(progresso).toBeTruthy();
    expect(perfil).toBeTruthy();

    // Hoje é a aba inicial (ativa) — Cobre, mesma cor de destaque do botão
    // primário e do ponto de crescimento do RootProgressIcon. As outras
    // duas começam inativas — Terra Suave, nunca Musgo (que já carrega
    // estrutura/conclusão em outros lugares do app).
    expect(StyleSheet.flatten(hoje.props.style).color).toBe(
      theme.colors.accent,
    );
    expect(StyleSheet.flatten(progresso.props.style).color).toBe(
      theme.colors.terraSuave,
    );
    expect(StyleSheet.flatten(perfil.props.style).color).toBe(
      theme.colors.terraSuave,
    );
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
