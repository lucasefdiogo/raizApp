import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, Home, User } from 'lucide-react-native';
import { theme } from '../theme';
import { HojeStack } from './HojeStack';
import { ProgressoStack } from './ProgressoStack';
import { PerfilStack } from './PerfilStack';

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

interface MainTabNavigatorProps {
  uid: string;
}

export function MainTabNavigator({ uid }: MainTabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="HojeTab"
        options={{ title: 'Hoje', tabBarIcon: HojeTabIcon }}
      >
        {() => <HojeStack uid={uid} />}
      </Tab.Screen>
      <Tab.Screen
        name="ProgressoTab"
        options={{ title: 'Progresso', tabBarIcon: ProgressoTabIcon }}
      >
        {() => <ProgressoStack uid={uid} />}
      </Tab.Screen>
      <Tab.Screen
        name="PerfilTab"
        options={{ title: 'Perfil', tabBarIcon: PerfilTabIcon }}
      >
        {() => <PerfilStack uid={uid} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
