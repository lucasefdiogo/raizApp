import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { ProgressoScreen } from '../screens/progress/ProgressoScreen';

export type ProgressoStackParamList = {
  Progresso: undefined;
};

const Stack = createNativeStackNavigator<ProgressoStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

interface ProgressoStackProps {
  uid: string;
}

export function ProgressoStack({ uid }: ProgressoStackProps) {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Progresso">
        {() => <ProgressoScreen uid={uid} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
