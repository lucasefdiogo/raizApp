import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useStreak } from '../hooks/useStreak';
import { useRecoveryState } from '../hooks/useRecoveryState';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { HomeScreen } from '../screens/HomeScreen';
import { RecoveryStateScreen } from '../screens/home/RecoveryStateScreen';
import { ReturnAfterPauseScreen } from '../screens/home/ReturnAfterPauseScreen';
import { AppBlockConfigScreen } from '../screens/appblock/AppBlockConfigScreen';
import { RefAlvoTour } from '../components/tour/FeatureTourOverlay';

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
  /**
   * Vem do useLocalNotifications que já roda no RootNavigator (mesmo
   * estágio de boot que decide priming vs. Main) — a aba Hoje só consome,
   * não instancia o hook de novo (evitaria duplicar solicitarPermissao/
   * agendarLembreteDiario a cada boot).
   */
  avaliarAlertaRisco: (essencialConcluidaHoje: boolean) => void;
  /**
   * Refs pros botões reais das abas Progresso/Perfil, criados no
   * MainTabNavigator (só ele tem acesso a esses nós nativos) — repassados
   * até a HomeScreen sem tocar neles, só pra ela medir a posição nos
   * passos 4-5 do tour de funcionalidades (ver FeatureTourOverlay).
   */
  progressoTabRef: RefAlvoTour;
  perfilTabRef: RefAlvoTour;
}

/**
 * Decide a rota inicial da aba Hoje: retorno após pausa (2+ dias) tem
 * prioridade sobre a recaída de 1 dia, que tem prioridade sobre a Home
 * normal — mesma lógica que já vivia no RootNavigator antes das abas
 * existirem, só que agora escopada à aba Hoje. useStreak roda aqui (não
 * mais no RootNavigator) porque só a aba Hoje depende do resultado dele.
 */
export function HojeStack({
  uid,
  avaliarAlertaRisco,
  progressoTabRef,
  perfilTabRef,
}: HojeStackProps) {
  const streak = useStreak(uid);
  const recovery = useRecoveryState(
    streak.statusDiaAnterior,
    streak.streakAtual,
    streak.diasTotaisAtivos,
  );

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
              avaliarAlertaRisco={avaliarAlertaRisco}
              recarregarStreak={streak.recarregar}
              aoAbrirBloqueioApps={() => navigation.navigate('AppBlockConfig')}
              progressoTabRef={progressoTabRef}
              perfilTabRef={perfilTabRef}
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
