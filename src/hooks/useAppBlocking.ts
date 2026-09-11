import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppInstalado,
  getInitialBlockedPackage,
  getInstalledApps,
  registrarDesbloqueioTemporario,
  subscribeToBlockedApp,
} from '../native/AccessibilityDetection';
import {
  buscarDesbloqueiosHojeDoApp,
  incrementarDesbloqueiosHoje,
} from '../services/firestore';
import {
  calcularNivelDesbloqueio,
  exigeReflexao,
  obterDuracaoRespiracao,
} from '../domain/appBlockEscalation';

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface AppBloqueadoInfo {
  packageName: string;
  nome: string;
  icone: string | null;
}

interface UseAppBlockingResultado {
  appBloqueadoAtual: AppBloqueadoInfo | null;
  /** Duração da pausa de respiração pro nível de escalação atual (segundos). */
  duracaoRespiracaoSegundos: number;
  /** Se true, a tela de bloqueio exige um texto de reflexão antes de liberar. */
  precisaReflexao: boolean;
  /**
   * Registra o desbloqueio temporário no lado nativo. Não fecha a tela de
   * bloqueio por si só — quem chama decide quando (depois de mostrar a
   * confirmação "Liberado por X minutos"). Também incrementa (fire-and-forget,
   * não bloqueia o desbloqueio) o contador de desbloqueios do dia, usado pra
   * escalar a exigência dos próximos — ver domain/appBlockEscalation.ts.
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
 *
 * `uid` alimenta o custo crescente entre desbloqueios (Fase 3, último
 * incremento): a cada novo app bloqueado detectado, busca quantos
 * desbloqueios já aconteceram hoje (total, somando todos os apps) pra
 * calcular o nível de escalação atual. `uid` null (usuário não
 * autenticado) mantém o nível 1 (sem escalar) — não deveria acontecer na
 * prática, já que a tela de bloqueio só é montada com auth.user presente.
 */
export function useAppBlocking(uid: string | null): UseAppBlockingResultado {
  const [appBloqueadoAtual, setAppBloqueadoAtual] =
    useState<AppBloqueadoInfo | null>(null);
  const [desbloqueiosHoje, setDesbloqueiosHoje] = useState(0);
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

  useEffect(() => {
    if (!appBloqueadoAtual || !uid) {
      return;
    }
    let cancelado = false;
    buscarDesbloqueiosHojeDoApp(uid, hojeISO()).then(quantidade => {
      if (!cancelado) {
        setDesbloqueiosHoje(quantidade);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [appBloqueadoAtual, uid]);

  const nivelAtual = calcularNivelDesbloqueio(desbloqueiosHoje);
  const duracaoRespiracaoSegundos = obterDuracaoRespiracao(nivelAtual);
  const precisaReflexao = exigeReflexao(nivelAtual);

  const desbloquear = useCallback(
    (minutos: number) => {
      if (!appBloqueadoAtual) {
        return;
      }
      if (uid) {
        // Fire-and-forget: o incremento atômico não precisa terminar antes
        // de liberar o app (é a exigência do PRÓXIMO desbloqueio que
        // escala, não este).
        incrementarDesbloqueiosHoje(uid, hojeISO());
      }
      registrarDesbloqueioTemporario(appBloqueadoAtual.packageName, minutos);
    },
    [appBloqueadoAtual, uid],
  );

  const dispensar = useCallback(() => setAppBloqueadoAtual(null), []);

  return {
    appBloqueadoAtual,
    duracaoRespiracaoSegundos,
    precisaReflexao,
    desbloquear,
    dispensar,
  };
}
