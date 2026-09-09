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
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { TutorialScreen } from '../screens/tutorial/TutorialScreen';
import { HomeScreen } from '../screens/HomeScreen';

export type RootStackParamList = {
  Tutorial: undefined;
  Onboarding: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

export function RootNavigator() {
  const tutorial = useTutorialStatus();
  const onboarding = useOnboardingStatus();

  if (tutorial.carregando || onboarding.carregando) {
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
            {/* TODO: quando a AuthStack existir, "Começar" deve levar à
                Onboarding/Home (fluxo atual) e "Já tenho conta" deve levar
                à tela de login dentro da AuthStack. Por ora os dois botões
                e o "pular" apontam para o mesmo fluxo pós-tutorial. */}
            {() => <TutorialScreen onConcluir={tutorial.marcarTutorialVisto} />}
          </Stack.Screen>
        ) : onboarding.completo ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onConcluir={onboarding.marcarComoCompleto} />}
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
