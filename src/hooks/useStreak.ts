import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aplicarResultadoDia,
  avaliarDiaCumprido,
  deveRenovarEscudo,
  renovarEscudo,
} from '../domain/streak';
import { EstadoStreak, StatusDiaResultante, StatusStreak } from '../domain/types';
import {
  atualizarEstadoStreak,
  buscarDailyLog,
  buscarEstadoStreak,
} from '../services/firestore';
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

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function dataDeOntem(hoje: Date): string {
  const ontem = new Date(hoje);
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  return paraISO(ontem);
}

/**
 * Lê o estado do streak no Firestore, roda a avaliação do dia anterior e a
 * renovação semanal do escudo (domain/streak.ts) e grava o resultado de
 * volta. Roda uma vez por abertura do app (por mudança de uid), não a cada
 * render — nenhum efeito colateral acontece fora desse único useEffect.
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

  const processar = useCallback(async () => {
    if (!uid) {
      setCarregando(false);
      return;
    }

    const processamento = ++processamentoRef.current;
    const aindaAtual = () => processamentoRef.current === processamento;

    const hoje = new Date();
    const hojeISO = paraISO(hoje);

    let estadoAtual = await buscarEstadoStreak(uid);
    if (!aindaAtual()) {
      return;
    }
    if (!estadoAtual) {
      setCarregando(false);
      return;
    }

    if (estadoAtual.ultimoDiaAtivo && estadoAtual.ultimoDiaAtivo !== hojeISO) {
      const logOntem = await buscarDailyLog(uid, dataDeOntem(hoje));
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
    }

    const dataRenovacao = estadoAtual.dataUltimaRenovacaoEscudo
      ? new Date(`${estadoAtual.dataUltimaRenovacaoEscudo}T00:00:00Z`)
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
    } catch {
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [processar, showToast]);

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
