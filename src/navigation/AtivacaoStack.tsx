import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { AtivacaoConviteScreen } from '../screens/ativacao/AtivacaoConviteScreen';
import { BloqueioAppsScreen } from '../screens/perfil/BloqueioAppsScreen';
import { DivulgacaoAcessibilidadeScreen } from '../screens/perfil/DivulgacaoAcessibilidadeScreen';
import { DivulgacaoAcessoUsoScreen } from '../screens/perfil/DivulgacaoAcessoUsoScreen';

export type AtivacaoStackParamList = {
  AtivacaoConvite: undefined;
  BloqueioApps: undefined;
  DivulgacaoAcessibilidade: undefined;
  DivulgacaoAcessoUso: undefined;
};

const Stack = createNativeStackNavigator<AtivacaoStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

interface AtivacaoStackProps {
  uid: string;
  onConcluir: () => void;
}

/**
 * Convite de ativação do bloqueio mostrado uma vez depois do onboarding
 * (ver useAtivacaoBloqueio) — reaproveita as mesmas telas de configuração
 * do PerfilStack, sem aoAbrirRotina (essa navegação não existe aqui).
 */
export function AtivacaoStack({ uid, onConcluir }: AtivacaoStackProps) {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AtivacaoConvite">
        {({ navigation }) => (
          <AtivacaoConviteScreen
            aoConfigurar={() => navigation.navigate('BloqueioApps')}
            aoPular={onConcluir}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BloqueioApps">
        {({ navigation }) => (
          <BloqueioAppsScreen
            uid={uid}
            aoTocarAtivar={() => navigation.navigate('DivulgacaoAcessibilidade')}
            aoTocarSaibaOQueE={() => navigation.navigate('DivulgacaoAcessibilidade')}
            aoTocarMedirTempo={() => navigation.navigate('DivulgacaoAcessoUso')}
            onVoltar={onConcluir}
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
