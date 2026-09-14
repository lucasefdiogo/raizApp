import React, { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import {
  BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { BarChart3, Home, User } from 'lucide-react-native';
import { theme } from '../theme';
import { HojeStack } from './HojeStack';
import { ProgressoStack } from './ProgressoStack';
import { PerfilStack } from './PerfilStack';
import { RefAlvoTour } from '../components/tour/FeatureTourOverlay';

export type MainTabParamList = {
  HojeTab: undefined;
  ProgressoTab: undefined;
  PerfilTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  color: string;
  size: number;
}

function HojeTabIcon({ color, size }: TabIconProps) {
  return <Home color={color} size={size} />;
}

function ProgressoTabIcon({ color, size }: TabIconProps) {
  return <BarChart3 color={color} size={size} />;
}

function PerfilTabIcon({ color, size }: TabIconProps) {
  return <User color={color} size={size} />;
}

interface TabBarButtonComRefProps extends BottomTabBarButtonProps {
  tabRef: RefAlvoTour;
}

// Componente nomeado no módulo (não uma função criada a cada render dentro
// de tabBarButton) — só assim o tipo do componente se mantém estável entre
// renders. `...props` preserva o toque normal da aba.
function TabBarButtonComRef({ tabRef, ...props }: TabBarButtonComRefProps) {
  return <Pressable {...props} ref={tabRef} collapsable={false} />;
}

interface MainTabNavigatorProps {
  uid: string;
  /** Repassado só até o HojeStack — ver useLocalNotifications no RootNavigator. */
  avaliarAlertaRisco: (essencialConcluidaHoje: boolean) => void;
}

export function MainTabNavigator({
  uid,
  avaliarAlertaRisco,
}: MainTabNavigatorProps) {
  // Únicos consumidores: os passos 4-5 do tour de funcionalidades (ver
  // FeatureTourOverlay), que precisam medir a posição real dos botões de
  // aba Progresso/Perfil pra desenhar o recorte sobre eles — a HomeScreen
  // não consegue criar esses refs sozinha porque os nós nativos desses
  // botões só existem aqui (ramo diferente da árvore). tabBarButton
  // customizado só nessas duas abas, espalhando `...props` pra preservar o
  // toque normal — não é usado pra nenhum outro propósito.
  const progressoTabRef: RefAlvoTour = useRef<React.ComponentRef<typeof View>>(
    null,
  );
  const perfilTabRef: RefAlvoTour = useRef<React.ComponentRef<typeof View>>(
    null,
  );
  const renderProgressoTabButton = useCallback(
    (props: BottomTabBarButtonProps) => (
      <TabBarButtonComRef {...props} tabRef={progressoTabRef} />
    ),
    [progressoTabRef],
  );
  const renderPerfilTabButton = useCallback(
    (props: BottomTabBarButtonProps) => (
      <TabBarButtonComRef {...props} tabRef={perfilTabRef} />
    ),
    [perfilTabRef],
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Cobre é a única cor de destaque por tela (mesma regra do botão
        // primário e do ponto de crescimento do RootProgressIcon) — Musgo
        // não entra aqui porque já carrega o significado de
        // estrutura/conclusão em outros lugares do app.
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.terraSuave,
      }}
    >
      <Tab.Screen
        name="HojeTab"
        options={{ title: 'Hoje', tabBarIcon: HojeTabIcon }}
      >
        {() => (
          <HojeStack
            uid={uid}
            avaliarAlertaRisco={avaliarAlertaRisco}
            progressoTabRef={progressoTabRef}
            perfilTabRef={perfilTabRef}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="ProgressoTab"
        options={{
          title: 'Progresso',
          tabBarIcon: ProgressoTabIcon,
          tabBarButton: renderProgressoTabButton,
        }}
      >
        {() => <ProgressoStack uid={uid} />}
      </Tab.Screen>
      <Tab.Screen
        name="PerfilTab"
        options={{
          title: 'Perfil',
          tabBarIcon: PerfilTabIcon,
          tabBarButton: renderPerfilTabButton,
        }}
      >
        {() => <PerfilStack uid={uid} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
