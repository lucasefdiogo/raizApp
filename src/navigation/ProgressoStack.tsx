import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { ProgressoScreen } from '../screens/progress/ProgressoScreen';
import { DivulgacaoAcessoUsoScreen } from '../screens/perfil/DivulgacaoAcessoUsoScreen';

export type ProgressoStackParamList = {
  Progresso: undefined;
  DivulgacaoAcessoUso: undefined;
};

const Stack = createNativeStackNavigator<ProgressoStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

interface ProgressoStackProps {
  uid: string;
}

export function ProgressoStack({ uid }: ProgressoStackProps) {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Progresso">
        {({ navigation }) => (
          <ProgressoScreen
            uid={uid}
            aoTocarMedirTempo={() => navigation.navigate('DivulgacaoAcessoUso')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DivulgacaoAcessoUso">
        {({ navigation }) => (
          <DivulgacaoAcessoUsoScreen uid={uid} onVoltar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
