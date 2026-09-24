import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  aplicarResultadoDia,
  avaliarDiaCumprido,
  deveRenovarEscudo,
  inicializarPrimeiroDia,
  renovarEscudo,
} from '../domain/streak';
import { EstadoStreak, StatusDiaResultante, StatusStreak } from '../domain/types';
import { dataDeOntemLocal, dataLocalDeISO, hojeISOLocal } from '../domain/data';
import {
  atualizarEstadoStreak,
  buscarDailyLog,
  buscarEstadoStreak,
} from '../services/firestore';
import { logMarcoStreakAtingido } from '../services/analytics';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';

const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';

interface UseStreakResultado {
  streakAtual: number;
  diasTotaisAtivos: number;
  escudosDisponiveis: number;
  statusDiaAnterior: StatusDiaResultante | null;
  statusStreak: StatusStreak;
  marcoAtingido: number | null;
  carregando: boolean;
  marcarRetornoConcluido: () => void;
  /**
   * Reexecuta a mesma leitura/avaliação do boot sob demanda (pull-to-refresh),
   * sem voltar a `carregando` — a Home já visível permanece na tela. A
   * avaliação do dia anterior só reroda se ainda não tiver rodado hoje, então
   * um refresh manual não ressurge o modal de marco nem a tela de recaída. Em
   * falha de rede, dispara o toast de erro.
   */
  recarregar: () => Promise<void>;
}

/**
 * Lê o estado do streak no Firestore, roda a avaliação do dia anterior e a
 * renovação semanal do escudo (domain/streak.ts) e grava o resultado de
 * volta. Roda uma vez por abertura do app (por mudança de uid), não a cada
 * render — nenhum efeito colateral acontece fora desse único useEffect.
 *
 * ultimoDiaAtivo vazio (usuário novo ou conta legada nunca inicializada)
 * é um caso à parte: não há dia anterior pra avaliar, então só inicializa
 * (inicializarPrimeiroDia) em vez de chamar aplicarResultadoDia — ver o
 * `if` logo abaixo. Também reprocessa sozinho se o app voltar do
 * background num dia local diferente do que tinha processado (AppState).
 */
export function useStreak(uid: string | null): UseStreakResultado {
  const { showToast } = useToast();
  const [estado, setEstado] = useState<EstadoStreak | null>(null);
  const [statusDiaAnterior, setStatusDiaAnterior] =
    useState<StatusDiaResultante | null>(null);
  const [marcoAtingido, setMarcoAtingido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Token do processamento em curso: se outro começar (troca de uid ou
  // recarregar manual), o anterior descarta o próprio resultado ao terminar.
  const processamentoRef = useRef(0);
  // Data (YYYY-MM-DD local) que o processamento mais recente considerou
  // "hoje" — usado só pelo listener de AppState abaixo.
  const dataProcessadaRef = useRef<string | null>(null);

  const processar = useCallback(async () => {
    if (!uid) {
      setCarregando(false);
      return;
    }

    const processamento = ++processamentoRef.current;
    const aindaAtual = () => processamentoRef.current === processamento;

    const hoje = new Date();
    const hojeISO = hojeISOLocal();
    dataProcessadaRef.current = hojeISO;

    let estadoAtual = await buscarEstadoStreak(uid);
    if (!aindaAtual()) {
      return;
    }
    if (!estadoAtual) {
      setCarregando(false);
      return;
    }

    if (!estadoAtual.ultimoDiaAtivo) {
      // Primeiro dia de uso (usuário novo) ou conta legada que nunca teve
      // o campo inicializado — sem dia anterior, nada a avaliar. NÃO passa
      // por aplicarResultadoDia (que trataria um dia fictício como "não
      // cumprido" e chegaria a consumir a proteção do usuário no dia 1):
      // só marca hoje como ponto de partida. Self-healing: roda de novo em
      // todo boot até o campo sair do vazio, então conta antiga afetada
      // por essa lacuna se corrige sozinha no próximo login.
      estadoAtual = inicializarPrimeiroDia(estadoAtual, hojeISO);
    } else if (estadoAtual.ultimoDiaAtivo !== hojeISO) {
      const logOntem = await buscarDailyLog(uid, dataDeOntemLocal(hoje));
      if (!aindaAtual()) {
        return;
      }
      const statusDia =
        logOntem && avaliarDiaCumprido(logOntem.tarefas)
          ? 'cumprido'
          : 'nao_cumprido';
      const temEscudoDisponivel = estadoAtual.escudosDisponiveis > 0;

      const resultado = aplicarResultadoDia(
        estadoAtual,
        statusDia,
        temEscudoDisponivel,
        hojeISO,
      );

      estadoAtual = {
        ...estadoAtual,
        streakAtual: resultado.streakAtual,
        diasTotaisAtivos: resultado.diasTotaisAtivos,
        escudosDisponiveis: resultado.escudosDisponiveis,
        marcosAtingidos: resultado.marcosAtingidos,
        ultimoDiaAtivo: hojeISO,
        statusStreak: resultado.statusStreak,
      };

      // Um evento de pausa (2+ dias) é resolvido pela tela de retorno após
      // pausa, não pela de recaída de 1 dia — statusDiaAnterior só é exposto
      // quando NÃO for esse o caso, senão as duas telas disputariam o mesmo
      // evento.
      if (resultado.statusStreak !== 'pausado') {
        setStatusDiaAnterior(resultado.statusDiaResultante);
      }
      setMarcoAtingido(resultado.marcoAtingido);
      if (resultado.marcoAtingido !== null) {
        logMarcoStreakAtingido(resultado.marcoAtingido);
      }
    }

    const dataRenovacao = estadoAtual.dataUltimaRenovacaoEscudo
      ? dataLocalDeISO(estadoAtual.dataUltimaRenovacaoEscudo)
      : new Date(0);
    if (deveRenovarEscudo(dataRenovacao, hoje)) {
      estadoAtual = renovarEscudo(estadoAtual, hoje);
    }

    await atualizarEstadoStreak(uid, estadoAtual);
    if (!aindaAtual()) {
      return;
    }

    setEstado(estadoAtual);
    setCarregando(false);
  }, [uid]);

  useEffect(() => {
    processar();
  }, [processar]);

  const recarregar = useCallback(async () => {
    try {
      await processar();
    } catch (erro) {
      registrarErro(erro as Error, 'useStreak.recarregar');
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [processar, showToast]);

  // App deixado em background durante a virada do dia e trazido de volta:
  // sem isso, ultimoDiaAtivo em memória fica preso no dia antigo até algum
  // outro gatilho reprocessar. Só reprocessa quando a data local realmente
  // mudou — não a cada volta ao primeiro plano.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', estadoApp => {
      if (
        estadoApp === 'active' &&
        dataProcessadaRef.current !== hojeISOLocal()
      ) {
        recarregar();
      }
    });
    return () => subscription.remove();
  }, [recarregar]);

  const marcarRetornoConcluido = useCallback(() => {
    setEstado(atual => (atual ? { ...atual, statusStreak: 'ativo' } : atual));
  }, []);

  return {
    streakAtual: estado?.streakAtual ?? 0,
    diasTotaisAtivos: estado?.diasTotaisAtivos ?? 0,
    escudosDisponiveis: estado?.escudosDisponiveis ?? 0,
    statusDiaAnterior,
    statusStreak: estado?.statusStreak ?? 'ativo',
    marcoAtingido,
    carregando,
    marcarRetornoConcluido,
    recarregar,
  };
}
