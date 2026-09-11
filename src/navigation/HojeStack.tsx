import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useStreak } from '../hooks/useStreak';
import { useRecoveryState } from '../hooks/useRecoveryState';
import { useLocalNotifications } from '../hooks/useLocalNotifications';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { HomeScreen } from '../screens/HomeScreen';
import { RecoveryStateScreen } from '../screens/home/RecoveryStateScreen';
import { ReturnAfterPauseScreen } from '../screens/home/ReturnAfterPauseScreen';
import { AppBlockConfigScreen } from '../screens/appblock/AppBlockConfigScreen';

export type HojeStackParamList = {
  Home: undefined;
  RecoveryState: undefined;
  ReturnAfterPause: undefined;
  // Mesma tela que o PerfilStack já usa — a Home só ganha um segundo
  // caminho de entrada pra ela, não uma cópia.
  AppBlockConfig: undefined;
};

const Stack = createNativeStackNavigator<HojeStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

interface HojeStackProps {
  uid: string;
}

/**
 * Decide a rota inicial da aba Hoje: retorno após pausa (2+ dias) tem
 * prioridade sobre a recaída de 1 dia, que tem prioridade sobre a Home
 * normal — mesma lógica que já vivia no RootNavigator antes das abas
 * existirem, só que agora escopada à aba Hoje. useStreak roda aqui (não
 * mais no RootNavigator) porque só a aba Hoje depende do resultado dele.
 */
export function HojeStack({ uid }: HojeStackProps) {
  const streak = useStreak(uid);
  const recovery = useRecoveryState(
    streak.statusDiaAnterior,
    streak.streakAtual,
    streak.diasTotaisAtivos,
  );
  const notificacoes = useLocalNotifications(uid, true);

  if (streak.carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {streak.statusStreak === 'pausado' ? (
        <Stack.Screen name="ReturnAfterPause">
          {() => (
            <ReturnAfterPauseScreen
              uid={uid}
              onConcluir={streak.marcarRetornoConcluido}
            />
          )}
        </Stack.Screen>
      ) : recovery.deveExibir && recovery.tipo && recovery.corpo !== null ? (
        <Stack.Screen name="RecoveryState">
          {() => (
            <RecoveryStateScreen
              tipo={recovery.tipo!}
              corpo={recovery.corpo!}
              onConcluir={recovery.marcarComoExibido}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Home">
          {({ navigation }) => (
            <HomeScreen
              uid={uid}
              streakAtual={streak.streakAtual}
              escudosDisponiveis={streak.escudosDisponiveis}
              marcoAtingido={streak.marcoAtingido}
              avaliarAlertaRisco={notificacoes.avaliarAlertaRisco}
              recarregarStreak={streak.recarregar}
              aoAbrirBloqueioApps={() => navigation.navigate('AppBlockConfig')}
            />
          )}
        </Stack.Screen>
      )}
      <Stack.Screen name="AppBlockConfig">
        {({ navigation }) => (
          <AppBlockConfigScreen uid={uid} aoVoltar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
