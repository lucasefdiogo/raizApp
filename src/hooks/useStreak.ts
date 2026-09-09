import { useEffect, useState } from 'react';
import {
  aplicarResultadoDia,
  avaliarDiaCumprido,
  deveRenovarEscudo,
  renovarEscudo,
} from '../domain/streak';
import { EstadoStreak, StatusDiaResultante } from '../domain/types';
import {
  atualizarEstadoStreak,
  buscarDailyLog,
  buscarEstadoStreak,
} from '../services/firestore';

interface UseStreakResultado {
  streakAtual: number;
  diasTotaisAtivos: number;
  escudosDisponiveis: number;
  statusDiaAnterior: StatusDiaResultante | null;
  marcoAtingido: number | null;
  carregando: boolean;
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
  const [estado, setEstado] = useState<EstadoStreak | null>(null);
  const [statusDiaAnterior, setStatusDiaAnterior] =
    useState<StatusDiaResultante | null>(null);
  const [marcoAtingido, setMarcoAtingido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCarregando(false);
      return;
    }

    let cancelado = false;

    async function processar(uidAtual: string) {
      const hoje = new Date();
      const hojeISO = paraISO(hoje);

      let estadoAtual = await buscarEstadoStreak(uidAtual);
      if (!estadoAtual) {
        if (!cancelado) {
          setCarregando(false);
        }
        return;
      }

      if (estadoAtual.ultimoDiaAtivo && estadoAtual.ultimoDiaAtivo !== hojeISO) {
        const logOntem = await buscarDailyLog(uidAtual, dataDeOntem(hoje));
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
        };

        if (!cancelado) {
          setStatusDiaAnterior(resultado.statusDiaResultante);
          setMarcoAtingido(resultado.marcoAtingido);
        }
      }

      const dataRenovacao = estadoAtual.dataUltimaRenovacaoEscudo
        ? new Date(`${estadoAtual.dataUltimaRenovacaoEscudo}T00:00:00Z`)
        : new Date(0);
      if (deveRenovarEscudo(dataRenovacao, hoje)) {
        estadoAtual = renovarEscudo(estadoAtual, hoje);
      }

      await atualizarEstadoStreak(uidAtual, estadoAtual);

      if (!cancelado) {
        setEstado(estadoAtual);
        setCarregando(false);
      }
    }

    processar(uid);

    return () => {
      cancelado = true;
    };
  }, [uid]);

  return {
    streakAtual: estado?.streakAtual ?? 0,
    diasTotaisAtivos: estado?.diasTotaisAtivos ?? 0,
    escudosDisponiveis: estado?.escudosDisponiveis ?? 0,
    statusDiaAnterior,
    marcoAtingido,
    carregando,
  };
}
