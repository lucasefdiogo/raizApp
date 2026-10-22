import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { RotinaPerfilScreen } from '../screens/perfil/RotinaPerfilScreen';
import { BloqueioAppsScreen } from '../screens/perfil/BloqueioAppsScreen';
import { DivulgacaoAcessibilidadeScreen } from '../screens/perfil/DivulgacaoAcessibilidadeScreen';
import { DivulgacaoAcessoUsoScreen } from '../screens/perfil/DivulgacaoAcessoUsoScreen';

export type PerfilStackParamList = {
  Perfil: undefined;
  BloqueioApps: undefined;
  RotinaPerfil: undefined;
  DivulgacaoAcessibilidade: undefined;
  DivulgacaoAcessoUso: undefined;
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
            aoAbrirBloqueioApps={() => navigation.navigate('BloqueioApps')}
            aoAbrirRotina={() => navigation.navigate('RotinaPerfil')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="RotinaPerfil">
        {({ navigation }) => (
          <RotinaPerfilScreen uid={uid} onVoltar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="BloqueioApps">
        {({ navigation }) => (
          <BloqueioAppsScreen
            uid={uid}
            aoTocarAtivar={() => navigation.navigate('DivulgacaoAcessibilidade')}
            aoTocarSaibaOQueE={() => navigation.navigate('DivulgacaoAcessibilidade')}
            aoTocarMedirTempo={() => navigation.navigate('DivulgacaoAcessoUso')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DivulgacaoAcessibilidade">
        {({ navigation }) => (
          <DivulgacaoAcessibilidadeScreen uid={uid} onVoltar={() => navigation.goBack()} />
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
