import { useEffect, useState } from 'react';
import { construirHistoricoSemana, DiaHistorico } from '../domain/progress';
import { buscarEstadoStreak, buscarUltimosDailyLogs } from '../services/firestore';

const DIAS_HISTORICO = 7;

interface UseProgressoSemanalResultado {
  historico: DiaHistorico[];
  streakAtual: number;
  diasTotaisAtivos: number;
  carregando: boolean;
}

/**
 * Lê os últimos 7 dailyLogs e o estado de streak (mesma fonte que useStreak
 * usa — buscarEstadoStreak — pra não ter dois lugares lendo o mesmo campo
 * de forma diferente) e monta o histórico visual via domain/progress.ts.
 * Não escreve nada no Firestore.
 */
export function useProgressoSemanal(uid: string): UseProgressoSemanalResultado {
  const [historico, setHistorico] = useState<DiaHistorico[]>([]);
  const [streakAtual, setStreakAtual] = useState(0);
  const [diasTotaisAtivos, setDiasTotaisAtivos] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [dailyLogs, estado] = await Promise.all([
        buscarUltimosDailyLogs(uid, DIAS_HISTORICO),
        buscarEstadoStreak(uid),
      ]);

      if (cancelado) {
        return;
      }

      setHistorico(construirHistoricoSemana(dailyLogs, new Date()));
      setStreakAtual(estado?.streakAtual ?? 0);
      setDiasTotaisAtivos(estado?.diasTotaisAtivos ?? 0);
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid]);

  return { historico, streakAtual, diasTotaisAtivos, carregando };
}
