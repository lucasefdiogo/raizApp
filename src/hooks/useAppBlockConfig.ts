import { useCallback, useEffect, useRef, useState } from 'react';
import {
  alternarAppNaSelecao,
  estaDentroDaJanelaDeHorario,
} from '../domain/appBlock';
import { BloqueioAppsConfig } from '../domain/types';
import { atualizarConfigBloqueioApps, buscarUsuario } from '../services/firestore';
import {
  AppInstalado,
  getInstalledApps,
  syncBloqueioConfig,
} from '../native/AccessibilityDetection';
import { useToast } from './useToast';

const CONFIG_PADRAO: BloqueioAppsConfig = {
  ativo: false,
  appsSelecionados: [],
  horarioInicio: null,
  horarioFim: null,
};

const MENSAGEM_FALHA_SELECAO =
  'Não conseguimos salvar essa seleção agora. Tente de novo.';
const MENSAGEM_FALHA_HORARIO =
  'Não conseguimos salvar o horário agora. Tente de novo.';
const MENSAGEM_FALHA_ATIVO =
  'Não conseguimos atualizar o bloqueio agora. Tente de novo.';
const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';

interface UseAppBlockConfigResultado {
  appsInstalados: AppInstalado[];
  configAtual: BloqueioAppsConfig;
  carregando: boolean;
  alternarApp: (packageName: string) => Promise<void>;
  salvarHorario: (inicio: string, fim: string) => Promise<void>;
  alternarAtivo: (ativo: boolean) => Promise<void>;
  /**
   * Força uma nova leitura de bloqueioApps e da lista de apps instalados
   * sob demanda (pull-to-refresh), sem voltar a `carregando`. Em falha de
   * rede, dispara o toast de erro.
   */
  recarregar: () => Promise<void>;
  /**
   * true só quando o bloqueio está ligado E o horário atual do aparelho
   * cai dentro da janela configurada — indicativo pra exibição (Home),
   * não uma leitura em tempo real do que o AccessibilityService está
   * aplicando de fato.
   */
  ativoAgora: boolean;
}

/**
 * Lê bloqueioApps de users/{uid} (mesma fonte — buscarUsuario — que
 * usePerfil/useStreak já leem) e a lista de apps instalados do módulo
 * nativo, uma vez por montagem. Cada mutação é otimista com rollback
 * silencioso + toast, mesmo padrão de useDailyTasks: sempre manda o
 * BloqueioAppsConfig inteiro pro Firestore, nunca um campo isolado.
 */
export function useAppBlockConfig(uid: string): UseAppBlockConfigResultado {
  const { showToast } = useToast();
  const [appsInstalados, setAppsInstalados] = useState<AppInstalado[]>([]);
  const [config, setConfig] = useState<BloqueioAppsConfig>(CONFIG_PADRAO);
  const [carregando, setCarregando] = useState(true);
  // Token da leitura em curso: se outra começar (troca de uid ou recarregar
  // manual), a anterior descarta o próprio resultado ao terminar.
  const leituraRef = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;

    const [usuario, apps] = await Promise.all([
      buscarUsuario(uid),
      getInstalledApps(),
    ]);

    if (leituraRef.current !== leitura) {
      return;
    }

    const configLida = usuario?.bloqueioApps ?? CONFIG_PADRAO;
    setConfig(configLida);
    setAppsInstalados(apps);
    setCarregando(false);

    // Garante que o lado nativo tem a config mais recente mesmo se a última
    // mudança foi feita e o app fechado antes de qualquer outra sincronia
    // (o Accessibility Service lê só do SharedPreferences, não do Firestore).
    syncBloqueioConfig(configLida);
  }, [uid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregar = useCallback(async () => {
    try {
      await carregar();
    } catch {
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  const persistir = useCallback(
    async (novaConfig: BloqueioAppsConfig, mensagemFalha: string) => {
      const anterior = config;
      setConfig(novaConfig);
      try {
        await atualizarConfigBloqueioApps(uid, novaConfig);
        syncBloqueioConfig(novaConfig);
      } catch {
        setConfig(anterior);
        showToast(mensagemFalha);
      }
    },
    [uid, config, showToast],
  );

  const alternarApp = useCallback(
    (packageName: string) => {
      const novaSelecao = alternarAppNaSelecao(
        config.appsSelecionados,
        packageName,
      );
      return persistir(
        { ...config, appsSelecionados: novaSelecao },
        MENSAGEM_FALHA_SELECAO,
      );
    },
    [config, persistir],
  );

  const salvarHorario = useCallback(
    (inicio: string, fim: string) =>
      persistir(
        { ...config, horarioInicio: inicio, horarioFim: fim },
        MENSAGEM_FALHA_HORARIO,
      ),
    [config, persistir],
  );

  const alternarAtivo = useCallback(
    (ativo: boolean) => persistir({ ...config, ativo }, MENSAGEM_FALHA_ATIVO),
    [config, persistir],
  );

  const ativoAgora =
    config.ativo &&
    estaDentroDaJanelaDeHorario(config.horarioInicio, config.horarioFim);

  return {
    appsInstalados,
    configAtual: config,
    carregando,
    alternarApp,
    salvarHorario,
    alternarAtivo,
    recarregar,
    ativoAgora,
  };
}
