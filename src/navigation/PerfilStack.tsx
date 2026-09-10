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

export function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Perfil" component={PerfilScreen} />
    </Stack.Navigator>
  );
}
