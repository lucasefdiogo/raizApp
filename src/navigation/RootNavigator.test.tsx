import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { RootNavigator } from './RootNavigator';

jest.mock('../hooks/useTutorialStatus');
jest.mock('../hooks/useAuth');
jest.mock('../hooks/useOnboardingStatus');
jest.mock('../hooks/useAppBlocking');
jest.mock('./MainTabNavigator', () => ({
  MainTabNavigator: ({ uid }: { uid: string }) => {
    const { Text } = require('react-native');
    return <Text>MainTabNavigator uid={uid}</Text>;
  },
}));
// Roteamento é o que este teste cobre; o conteúdo do onboarding tem teste
// próprio (src/screens/OnboardingScreen.test.tsx).
jest.mock('../screens/OnboardingScreen', () => ({
  OnboardingScreen: () => {
    const { Text } = require('react-native');
    return <Text>OnboardingScreen</Text>;
  },
}));

// A AppBlockedScreen tem teste próprio (AppBlockedScreen.test.tsx) — aqui
// só interessa que ela apareça (ou não) com a prioridade certa.
jest.mock('../screens/appblock/AppBlockedScreen', () => ({
  AppBlockedScreen: ({
    uid,
    appBloqueado,
  }: {
    uid: string;
    appBloqueado: { nome: string };
  }) => {
    const { Text } = require('react-native');
    return <Text>APP_BLOQUEADO uid={uid} nome={appBloqueado.nome}</Text>;
  },
}));

// A SplashScreen tem teste próprio (src/screens/splash/SplashScreen.test.tsx).
// Aqui ela é um stub que só respeita o contrato de tempo: chama
// onAnimationEnd depois de DURACAO_SPLASH_MS.
const DURACAO_SPLASH_MS = 1200;
jest.mock('../screens/splash/SplashScreen', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    DURACAO_SPLASH_MS: 1200,
    SplashScreen: ({ onAnimationEnd }: { onAnimationEnd: () => void }) => {
      ReactLib.useEffect(() => {
        const t = setTimeout(onAnimationEnd, 1200);
        return () => clearTimeout(t);
      }, [onAnimationEnd]);
      return <Text>SPLASH_ROOTORA</Text>;
    },
  };
});

const DURACAO_FADE_OUT_SPLASH_MS = 300;

const { useTutorialStatus } = require('../hooks/useTutorialStatus');
const { useAuth } = require('../hooks/useAuth');
const { useOnboardingStatus } = require('../hooks/useOnboardingStatus');
const { useAppBlocking } = require('../hooks/useAppBlocking');

function authAutenticado() {
  return {
    carregando: false,
    user: { uid: 'uid-teste' },
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signUp: jest.fn(),
    resetPassword: jest.fn(),
  };
}

function configurarHooksPadrao() {
  useTutorialStatus.mockReturnValue({
    carregando: false,
    tutorialVisto: true,
    marcarTutorialVisto: jest.fn(),
  });
  useAuth.mockReturnValue(authAutenticado());
  useOnboardingStatus.mockReturnValue({
    carregando: false,
    completo: true,
    marcarComoCompleto: jest.fn(),
  });
  useAppBlocking.mockReturnValue({
    appBloqueadoAtual: null,
    desbloquear: jest.fn(),
    dispensar: jest.fn(),
  });
}

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    configurarHooksPadrao();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // Deixa a splash terminar (tempo mínimo + fade out) pra checar a rota
  // final já revelada.
  async function passarSplash() {
    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS);
    });
    await act(async () => {
      jest.advanceTimersByTime(DURACAO_FADE_OUT_SPLASH_MS);
    });
  }

  it('tutorial não visto: mostra a TutorialScreen depois da splash', async () => {
    useTutorialStatus.mockReturnValue({
      carregando: false,
      tutorialVisto: false,
      marcarTutorialVisto: jest.fn(),
    });

    await render(<RootNavigator />);
    await passarSplash();

    expect(screen.getByText('Isso te parece familiar?')).toBeTruthy();
  });

  it('sem usuário autenticado: mostra a SignInScreen depois da splash', async () => {
    useAuth.mockReturnValue({ ...authAutenticado(), user: null });

    await render(<RootNavigator />);
    await passarSplash();

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('autenticado, onboarding incompleto: mostra a OnboardingScreen depois da splash', async () => {
    useOnboardingStatus.mockReturnValue({
      carregando: false,
      completo: false,
      marcarComoCompleto: jest.fn(),
    });

    await render(<RootNavigator />);
    await passarSplash();

    expect(screen.getByText('OnboardingScreen')).toBeTruthy();
    expect(screen.queryByText('MainTabNavigator uid=uid-teste')).toBeNull();
  });

  it('autenticado e onboarding completo: mostra o MainTabNavigator com o uid certo depois da splash', async () => {
    await render(<RootNavigator />);
    await passarSplash();

    expect(screen.getByText('MainTabNavigator uid=uid-teste')).toBeTruthy();
  });

  it('a Splash aparece primeiro, antes de qualquer rota', async () => {
    await render(<RootNavigator />);

    expect(screen.getByText('SPLASH_ROOTORA')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS - 1);
    });
    expect(screen.getByText('SPLASH_ROOTORA')).toBeTruthy();
  });

  it('checagens instantâneas: a Splash não some antes do tempo mínimo (1200ms) e sai só depois do fade', async () => {
    await render(<RootNavigator />);

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS - 1);
    });
    expect(screen.queryByText('SPLASH_ROOTORA')).toBeTruthy();

    // completa o tempo mínimo -> dispara o fade out (ainda montada)
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('SPLASH_ROOTORA')).toBeTruthy();

    // fade out completo -> splash desmonta, rota revelada
    await act(async () => {
      jest.advanceTimersByTime(DURACAO_FADE_OUT_SPLASH_MS);
    });
    expect(screen.queryByText('SPLASH_ROOTORA')).toBeNull();
    expect(screen.getByText('MainTabNavigator uid=uid-teste')).toBeTruthy();
  });

  it('checagens lentas (> 1200ms): a Splash não corta no tempo mínimo, espera as checagens resolverem', async () => {
    useAuth.mockReturnValue({ ...authAutenticado(), carregando: true, user: null });

    const { rerender } = await render(<RootNavigator />);

    expect(screen.getByText('SPLASH_ROOTORA')).toBeTruthy();
    expect(screen.queryByText('MainTabNavigator uid=uid-teste')).toBeNull();

    // passou o tempo mínimo da animação, mas as checagens ainda não
    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS + 500);
    });
    expect(screen.getByText('SPLASH_ROOTORA')).toBeTruthy();
    expect(screen.queryByText('MainTabNavigator uid=uid-teste')).toBeNull();

    // agora as checagens resolvem
    useAuth.mockReturnValue(authAutenticado());
    await act(async () => {
      rerender(<RootNavigator />);
    });

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_FADE_OUT_SPLASH_MS);
    });
    expect(screen.queryByText('SPLASH_ROOTORA')).toBeNull();
    expect(screen.getByText('MainTabNavigator uid=uid-teste')).toBeTruthy();
  });

  describe('bloqueio de apps', () => {
    it('sem app bloqueado: não mostra a AppBlockedScreen', async () => {
      await render(<RootNavigator />);
      await passarSplash();

      expect(screen.queryByText(/APP_BLOQUEADO/)).toBeNull();
    });

    it('com app bloqueado: aparece por cima de qualquer rota, mesmo antes da splash terminar', async () => {
      useAppBlocking.mockReturnValue({
        appBloqueadoAtual: {
          packageName: 'com.instagram.android',
          nome: 'Instagram',
          icone: null,
        },
        desbloquear: jest.fn(),
        dispensar: jest.fn(),
      });

      await render(<RootNavigator />);

      // Nem a splash terminou ainda (passarSplash não foi chamado) — a
      // tela de bloqueio tem prioridade sobre ela mesmo assim.
      expect(screen.getByText('SPLASH_ROOTORA')).toBeTruthy();
      expect(
        screen.getByText('APP_BLOQUEADO uid=uid-teste nome=Instagram'),
      ).toBeTruthy();
    });

    it('sem usuário autenticado: não mostra a AppBlockedScreen mesmo com um app bloqueado pendente', async () => {
      useAuth.mockReturnValue({ ...authAutenticado(), user: null });
      useAppBlocking.mockReturnValue({
        appBloqueadoAtual: {
          packageName: 'com.instagram.android',
          nome: 'Instagram',
          icone: null,
        },
        desbloquear: jest.fn(),
        dispensar: jest.fn(),
      });

      await render(<RootNavigator />);
      await passarSplash();

      expect(screen.queryByText(/APP_BLOQUEADO/)).toBeNull();
    });
  });
});
