import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { AppBlockConfigScreen } from '../screens/appblock/AppBlockConfigScreen';
import { AccessibilityDebugScreen } from '../screens/debug/AccessibilityDebugScreen';
import { MOSTRAR_DEBUG_ACESSIBILIDADE } from '../config/debugFlags';

// Atalho de debug (Fase 3, parte 1): sempre em dev; em release só quando a
// flag de teste está ligada à mão pra gerar o APK de validação em device.
const EXPOR_DEBUG_ACESSIBILIDADE = __DEV__ || MOSTRAR_DEBUG_ACESSIBILIDADE;

export type PerfilStackParamList = {
  Perfil: undefined;
  AppBlockConfig: undefined;
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
            aoAbrirBloqueioApps={() => navigation.navigate('AppBlockConfig')}
            aoAbrirDebugAcessibilidade={
              EXPOR_DEBUG_ACESSIBILIDADE
                ? () => navigation.navigate('AccessibilityDebug')
                : undefined
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="AppBlockConfig">
        {({ navigation }) => (
          <AppBlockConfigScreen uid={uid} aoVoltar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      {EXPOR_DEBUG_ACESSIBILIDADE && (
        <Stack.Screen
          name="AccessibilityDebug"
          component={AccessibilityDebugScreen}
        />
      )}
    </Stack.Navigator>
  );
}
