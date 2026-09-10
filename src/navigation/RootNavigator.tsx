import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { useTutorialStatus } from '../hooks/useTutorialStatus';
import { useAuth } from '../hooks/useAuth';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { TutorialScreen } from '../screens/tutorial/TutorialScreen';
import { SplashScreen } from '../screens/splash/SplashScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

export type RootStackParamList = {
  Tutorial: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

const DURACAO_FADE_OUT_SPLASH_MS = 300;

export function RootNavigator() {
  const tutorial = useTutorialStatus();
  const auth = useAuth();
  const onboarding = useOnboardingStatus(auth.user?.uid ?? null);

  // Mesmo boot logic de sempre — a Splash só consome o resultado, não
  // relê nada.
  const checagensResolvidas =
    !tutorial.carregando && !auth.carregando && !onboarding.carregando;

  const [splashAnimouAteOFim, setSplashAnimouAteOFim] = useState(false);
  const [splashMontada, setSplashMontada] = useState(true);
  const fadeSplash = useRef(new Animated.Value(1)).current;

  const encerrarAnimacaoSplash = useCallback(
    () => setSplashAnimouAteOFim(true),
    [],
  );

  // Só revela a rota quando o MAIOR entre (tempo mínimo da splash) e
  // (checagens resolvidas) já aconteceu.
  const prontoParaRevelar = checagensResolvidas && splashAnimouAteOFim;

  useEffect(() => {
    if (!prontoParaRevelar) {
      return;
    }

    Animated.timing(fadeSplash, {
      toValue: 0,
      duration: DURACAO_FADE_OUT_SPLASH_MS,
      useNativeDriver: true,
    }).start();

    // Desmonta a splash pelo timer (não pelo callback do Animated) pra a
    // transição ser determinística — a rota já está montada por baixo, sem
    // tela em branco no meio.
    const temporizador = setTimeout(
      () => setSplashMontada(false),
      DURACAO_FADE_OUT_SPLASH_MS,
    );
    return () => clearTimeout(temporizador);
  }, [prontoParaRevelar, fadeSplash]);

  return (
    <View style={styles.container}>
      {checagensResolvidas && (
        <NavigationContainer>
          <Stack.Navigator screenOptions={screenOptions}>
            {!tutorial.tutorialVisto ? (
              <Stack.Screen name="Tutorial">
                {/* TODO: diferenciar "Começar" (SignUp) de "Já tenho conta"
                    (SignIn) agora que a AuthStack existe — por ora os dois
                    botões e o "pular" só marcam a flag e caem na SignInScreen,
                    que já linka para as duas telas. */}
                {() => (
                  <TutorialScreen onConcluir={tutorial.marcarTutorialVisto} />
                )}
              </Stack.Screen>
            ) : !auth.user ? (
              <>
                <Stack.Screen name="SignIn">
                  {() => (
                    <SignInScreen
                      signIn={auth.signIn}
                      signInWithGoogle={auth.signInWithGoogle}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="SignUp">
                  {() => <SignUpScreen signUp={auth.signUp} />}
                </Stack.Screen>
                <Stack.Screen name="ForgotPassword">
                  {() => (
                    <ForgotPasswordScreen resetPassword={auth.resetPassword} />
                  )}
                </Stack.Screen>
              </>
            ) : onboarding.completo ? (
              <Stack.Screen name="Main">
                {() => <MainTabNavigator uid={auth.user!.uid} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Onboarding">
                {() => (
                  <OnboardingScreen
                    uid={auth.user!.uid}
                    onConcluir={onboarding.marcarComoCompleto}
                  />
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}

      {splashMontada && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: fadeSplash }]}
          pointerEvents={prontoParaRevelar ? 'none' : 'auto'}
        >
          <SplashScreen onAnimationEnd={encerrarAnimacaoSplash} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
