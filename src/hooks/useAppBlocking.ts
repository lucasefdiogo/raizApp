import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppInstalado,
  getInitialBlockedPackage,
  getInstalledApps,
  registrarDesbloqueioTemporario,
  subscribeToBlockedApp,
} from '../native/AccessibilityDetection';

export interface AppBloqueadoInfo {
  packageName: string;
  nome: string;
  icone: string | null;
}

interface UseAppBlockingResultado {
  appBloqueadoAtual: AppBloqueadoInfo | null;
  /**
   * Registra o desbloqueio temporário no lado nativo. Não fecha a tela de
   * bloqueio por si só — quem chama decide quando (depois de mostrar a
   * confirmação "Liberado por X minutos").
   */
  desbloquear: (minutos: number) => void;
  /** Fecha a tela de bloqueio sem registrar nenhum desbloqueio. */
  dispensar: () => void;
}

/**
 * Ponte pro fluxo de bloqueio de apps do lado JS. Duas origens pro mesmo
 * "app bloqueado detectado", pelo mesmo motivo que MainActivity.kt trata os
 * dois casos separado (ver comentário lá): app já aberto (ReactContext
 * vivo) emite EVENTO_APP_BLOQUEADO via subscribeToBlockedApp; cold start
 * (Rootora aberto pela primeira vez já a partir do bloqueio) não tem
 * listener a tempo de captar o evento, então é consultado 1x no boot via
 * getInitialBlockedPackage.
 *
 * getInstalledApps só é chamado 1x (cacheado em ref) pra resolver
 * nome/ícone do pacote bloqueado — não a cada bloqueio novo.
 */
export function useAppBlocking(): UseAppBlockingResultado {
  const [appBloqueadoAtual, setAppBloqueadoAtual] =
    useState<AppBloqueadoInfo | null>(null);
  const appsCacheRef = useRef<AppInstalado[] | null>(null);

  const resolverEExibir = useCallback(async (packageName: string) => {
    if (!appsCacheRef.current) {
      appsCacheRef.current = await getInstalledApps();
    }
    const encontrado = appsCacheRef.current.find(
      app => app.packageName === packageName,
    );
    setAppBloqueadoAtual({
      packageName,
      nome: encontrado?.nome ?? packageName,
      icone: encontrado?.icone ?? null,
    });
  }, []);

  useEffect(() => {
    getInitialBlockedPackage().then(packageName => {
      if (packageName) {
        resolverEExibir(packageName);
      }
    });
  }, [resolverEExibir]);

  useEffect(
    () => subscribeToBlockedApp(resolverEExibir),
    [resolverEExibir],
  );

  const desbloquear = useCallback(
    (minutos: number) => {
      if (!appBloqueadoAtual) {
        return;
      }
      registrarDesbloqueioTemporario(appBloqueadoAtual.packageName, minutos);
    },
    [appBloqueadoAtual],
  );

  const dispensar = useCallback(() => setAppBloqueadoAtual(null), []);

  return { appBloqueadoAtual, desbloquear, dispensar };
}
