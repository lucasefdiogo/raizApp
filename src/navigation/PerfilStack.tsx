import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { AccessibilityDebugScreen } from '../screens/debug/AccessibilityDebugScreen';

export type PerfilStackParamList = {
  Perfil: undefined;
  // Rota temporária de debug (Fase 3, parte 1) — só em dev, some numa tarefa futura.
  AccessibilityDebug: undefined;
};

const Stack = createNativeStackNavigator<PerfilStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

interface PerfilStackProps {
  uid: string;
}

export function PerfilStack({ uid }: PerfilStackProps) {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Perfil">
        {({ navigation }) => (
          <PerfilScreen
            uid={uid}
            aoAbrirDebugAcessibilidade={
              __DEV__
                ? () => navigation.navigate('AccessibilityDebug')
                : undefined
            }
          />
        )}
      </Stack.Screen>
      {__DEV__ && (
        <Stack.Screen
          name="AccessibilityDebug"
          component={AccessibilityDebugScreen}
        />
      )}
    </Stack.Navigator>
  );
}
