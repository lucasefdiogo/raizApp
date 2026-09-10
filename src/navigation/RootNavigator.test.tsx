import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RootNavigator } from './RootNavigator';

jest.mock('../hooks/useTutorialStatus');
jest.mock('../hooks/useAuth');
jest.mock('../hooks/useOnboardingStatus');
jest.mock('./MainTabNavigator', () => ({
  MainTabNavigator: ({ uid }: { uid: string }) => {
    const { Text } = require('react-native');
    return <Text>MainTabNavigator uid={uid}</Text>;
  },
}));

const { useTutorialStatus } = require('../hooks/useTutorialStatus');
const { useAuth } = require('../hooks/useAuth');
const { useOnboardingStatus } = require('../hooks/useOnboardingStatus');

function configurarHooksPadrao() {
  useTutorialStatus.mockReturnValue({
    carregando: false,
    tutorialVisto: true,
    marcarTutorialVisto: jest.fn(),
  });
  useAuth.mockReturnValue({
    carregando: false,
    user: { uid: 'uid-teste' },
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signUp: jest.fn(),
    resetPassword: jest.fn(),
  });
  useOnboardingStatus.mockReturnValue({
    carregando: false,
    completo: true,
    marcarComoCompleto: jest.fn(),
  });
}

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHooksPadrao();
  });

  it('tutorial não visto: mostra a TutorialScreen', async () => {
    useTutorialStatus.mockReturnValue({
      carregando: false,
      tutorialVisto: false,
      marcarTutorialVisto: jest.fn(),
    });

    await render(<RootNavigator />);

    expect(screen.getByText('Isso te parece familiar?')).toBeTruthy();
  });

  it('sem usuário autenticado: mostra a SignInScreen', async () => {
    useAuth.mockReturnValue({
      carregando: false,
      user: null,
      signIn: jest.fn(),
      signInWithGoogle: jest.fn(),
      signUp: jest.fn(),
      resetPassword: jest.fn(),
    });

    await render(<RootNavigator />);

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('autenticado, onboarding incompleto: mostra a OnboardingScreen', async () => {
    useOnboardingStatus.mockReturnValue({
      carregando: false,
      completo: false,
      marcarComoCompleto: jest.fn(),
    });

    await render(<RootNavigator />);

    expect(screen.getByText('Por que você quer estar aqui')).toBeTruthy();
    expect(screen.queryByText('MainTabNavigator uid=uid-teste')).toBeNull();
  });

  it('autenticado e onboarding completo: mostra o MainTabNavigator com o uid certo', async () => {
    await render(<RootNavigator />);

    expect(screen.getByText('MainTabNavigator uid=uid-teste')).toBeTruthy();
  });

  it('mostra o spinner de carregamento enquanto qualquer um dos hooks de boot ainda carrega', async () => {
    useAuth.mockReturnValue({
      carregando: true,
      user: null,
      signIn: jest.fn(),
      signInWithGoogle: jest.fn(),
      signUp: jest.fn(),
      resetPassword: jest.fn(),
    });

    await render(<RootNavigator />);

    expect(screen.queryByText('MainTabNavigator uid=uid-teste')).toBeNull();
    expect(screen.queryByText('Entrar')).toBeNull();
  });
});
