import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/MainTabNavigator';
import { STORAGE_KEYS, lerItem, salvarItem } from '../utils/storage';
import { TOTAL_PASSOS_TOUR } from '../components/tour/tourSteps';
import {
  logTourFuncionalidadesConcluido,
  logTourFuncionalidadesPulado,
} from '../services/analytics';

interface UseFeatureTourResultado {
  tourAtivo: boolean;
  passoAtual: number;
  avancar: () => void;
  pular: () => void;
  /** Chamada pelo link "Ver tutorial novamente" da Perfil — reseta a flag e
   * volta pra aba Hoje, onde o tour de fato aparece. */
  reiniciar: () => void;
}

/**
 * Tour de funcionalidades pós-onboarding (5 passos de coach mark sobre a UI
 * real da Home) — diferente do Tutorial Inicial (conceitual, pré-login).
 * Mesmo padrão de flag do useTutorialStatus (AsyncStorage,
 * tour_funcionalidades_visto), mas local a este hook: cada tela que chama
 * useFeatureTour tem seu próprio estado React, sincronizado pela flag via
 * useFocusEffect — é assim que reiniciar() (chamado da Perfil) consegue
 * reativar o tour na instância deste hook que vive na HomeScreen, sem
 * precisar levantar o estado pra um ancestral comum (MainTabNavigator não
 * tem lógica nenhuma, só navegação entre abas).
 */
export function useFeatureTour(): UseFeatureTourResultado {
  const navigation = useNavigation();
  const [tourAtivo, setTourAtivo] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);

  const verificar = useCallback(async () => {
    const visto = await lerItem<boolean>(STORAGE_KEYS.tourFuncionalidadesVisto);
    if (visto !== true) {
      setTourAtivo(true);
    }
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  // Cobre o caso de reiniciar() ter sido chamado a partir da Perfil: quando
  // a navegação volta pra aba Hoje, a HomeScreen ganha foco de novo e
  // relê a flag (já resetada) — sem isso, sua PRÓPRIA instância deste hook
  // nunca saberia que outra tela pediu reinício.
  useFocusEffect(
    useCallback(() => {
      verificar();
    }, [verificar]),
  );

  const concluir = useCallback(async () => {
    await salvarItem(STORAGE_KEYS.tourFuncionalidadesVisto, true);
    setTourAtivo(false);
  }, []);

  const avancar = useCallback(() => {
    if (passoAtual >= TOTAL_PASSOS_TOUR - 1) {
      logTourFuncionalidadesConcluido();
      concluir();
      return;
    }
    setPassoAtual(atual => atual + 1);
  }, [passoAtual, concluir]);

  const pular = useCallback(() => {
    logTourFuncionalidadesPulado(passoAtual);
    concluir();
  }, [passoAtual, concluir]);

  const reiniciar = useCallback(() => {
    (async () => {
      await salvarItem(STORAGE_KEYS.tourFuncionalidadesVisto, false);
      setPassoAtual(0);
      setTourAtivo(true);
      const tabNavigation =
        navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
      tabNavigation?.navigate('HojeTab');
    })();
  }, [navigation]);

  return { tourAtivo, passoAtual, avancar, pular, reiniciar };
}
