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
import { registrarErro } from '../services/crashlytics';
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
  // Token compartilhado entre carregar() e persistir(): só quem começou por
  // último pode aplicar o resultado no estado local e sincronizar o nativo.
  // Sem isso, uma leitura do Firestore que já estava em voo antes de um
  // toggle (persistir) pode resolver DEPOIS e sobrescrever tanto `config`
  // quanto o SharedPreferences com o dado antigo, mesmo com leituraRef
  // intacto (leituraRef só serializa carregar() contra outro carregar()).
  const operacaoRef = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;
    const operacao = ++operacaoRef.current;

    const [usuario, apps] = await Promise.all([
      buscarUsuario(uid),
      getInstalledApps(),
    ]);

    if (leituraRef.current !== leitura) {
      return;
    }

    setAppsInstalados(apps);
    setCarregando(false);

    if (operacaoRef.current !== operacao) {
      // Um persistir() (ou outro carregar()) mais recente já começou —
      // aplicar esta leitura agora sobrescreveria dado mais novo com um
      // mais velho.
      return;
    }
    const configLida = usuario?.bloqueioApps ?? CONFIG_PADRAO;
    setConfig(configLida);

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
    } catch (erro) {
      registrarErro(erro as Error, 'useAppBlockConfig.recarregar');
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  const persistir = useCallback(
    async (novaConfig: BloqueioAppsConfig, mensagemFalha: string) => {
      const anterior = config;
      const operacao = ++operacaoRef.current;
      setConfig(novaConfig);
      try {
        await atualizarConfigBloqueioApps(uid, novaConfig);
        if (operacaoRef.current === operacao) {
          syncBloqueioConfig(novaConfig);
        }
      } catch (erro) {
        registrarErro(erro as Error, 'useAppBlockConfig.persistir');
        if (operacaoRef.current === operacao) {
          setConfig(anterior);
        }
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
