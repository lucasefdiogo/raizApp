import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/MainTabNavigator';

/**
 * Convenção comum do Android: voltar numa aba que não é a Hoje troca pra
 * ela em vez de sair do app direto — só sai de fato quando já está na aba
 * Hoje (lá nenhum handler é registrado, o comportamento padrão do sistema
 * assume). Usar só na tela raiz de Progresso/Perfil — nunca numa tela
 * empurrada dentro da stack de uma aba (essas já têm seu próprio caminho
 * de volta, ver BackButton).
 */
export function useVoltarParaAbaHoje(): void {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          const tabNavigation =
            navigation.getParent<
              BottomTabNavigationProp<MainTabParamList>
            >();
          if (!tabNavigation) {
            return false;
          }
          tabNavigation.navigate('HojeTab');
          return true;
        },
      );
      return () => subscription.remove();
    }, [navigation]),
  );
}
