import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
import { HomeScreen } from '../screens/HomeScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

export type RootStackParamList = {
  Tutorial: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

export function RootNavigator() {
  const tutorial = useTutorialStatus();
  const auth = useAuth();
  const onboarding = useOnboardingStatus(auth.user?.uid ?? null);

  if (tutorial.carregando || auth.carregando || onboarding.carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator color={theme.colors.cobre} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!tutorial.tutorialVisto ? (
          <Stack.Screen name="Tutorial">
            {/* TODO: diferenciar "Começar" (SignUp) de "Já tenho conta"
                (SignIn) agora que a AuthStack existe — por ora os dois
                botões e o "pular" só marcam a flag e caem na SignInScreen,
                que já linka para as duas telas. */}
            {() => <TutorialScreen onConcluir={tutorial.marcarTutorialVisto} />}
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
          <Stack.Screen name="Home">
            {() => <HomeScreen uid={auth.user!.uid} />}
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
  );
}

const styles = StyleSheet.create({
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
