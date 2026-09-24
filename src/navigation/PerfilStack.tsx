import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { AppBlockConfigScreen } from '../screens/appblock/AppBlockConfigScreen';
import { AccessibilityDebugScreen } from '../screens/debug/AccessibilityDebugScreen';
import { InterceptDebugScreen } from '../screens/debug/InterceptDebugScreen';
import { MOSTRAR_DEBUG_ACESSIBILIDADE } from '../config/debugFlags';

// Atalho de debug (Fase 3, parte 1): sempre em dev; em release só quando a
// flag de teste está ligada à mão pra gerar o APK de validação em device.
const EXPOR_DEBUG_ACESSIBILIDADE = __DEV__ || MOSTRAR_DEBUG_ACESSIBILIDADE;
// Atalho de debug da InterceptScreen (Etapa 3 da spec 09-ponte-fuga-tarefa)
// — sempre em dev, mesma flag da acessibilidade (não é teste que precise
// rodar num APK release assinado, então não ganhou flag própria).
const EXPOR_DEBUG_INTERCEPT = __DEV__ || MOSTRAR_DEBUG_ACESSIBILIDADE;

export type PerfilStackParamList = {
  Perfil: undefined;
  AppBlockConfig: undefined;
  // Rota temporária de debug (Fase 3, parte 1) — só em dev, some numa tarefa futura.
  AccessibilityDebug: undefined;
  // Rota temporária de debug (Etapa 3 da spec 09) — só em dev.
  InterceptDebug: undefined;
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
            aoAbrirDebugIntercept={
              EXPOR_DEBUG_INTERCEPT
                ? () => navigation.navigate('InterceptDebug')
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
      {EXPOR_DEBUG_INTERCEPT && (
        <Stack.Screen name="InterceptDebug" component={InterceptDebugScreen} />
      )}
    </Stack.Navigator>
  );
}
