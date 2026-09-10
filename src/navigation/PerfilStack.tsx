import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';

export type PerfilStackParamList = {
  Perfil: undefined;
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
        {() => <PerfilScreen uid={uid} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
