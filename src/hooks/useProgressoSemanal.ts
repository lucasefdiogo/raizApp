import { useCallback, useEffect, useRef, useState } from 'react';
import { construirHistoricoSemana, DiaHistorico } from '../domain/progress';
import { buscarEstadoStreak, buscarUltimosDailyLogs } from '../services/firestore';
import { useToast } from './useToast';

const DIAS_HISTORICO = 7;

const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';

interface UseProgressoSemanalResultado {
  historico: DiaHistorico[];
  streakAtual: number;
  diasTotaisAtivos: number;
  carregando: boolean;
  /**
   * Força uma nova leitura dos últimos 7 dailyLogs e do estado de streak sob
   * demanda (pull-to-refresh), sem voltar a `carregando` — a faixa já
   * visível permanece na tela. Em falha de rede, dispara o toast de erro.
   */
  recarregar: () => Promise<void>;
}

/**
 * Lê os últimos 7 dailyLogs e o estado de streak (mesma fonte que useStreak
 * usa — buscarEstadoStreak — pra não ter dois lugares lendo o mesmo campo
 * de forma diferente) e monta o histórico visual via domain/progress.ts.
 * Não escreve nada no Firestore.
 */
export function useProgressoSemanal(uid: string): UseProgressoSemanalResultado {
  const { showToast } = useToast();
  const [historico, setHistorico] = useState<DiaHistorico[]>([]);
  const [streakAtual, setStreakAtual] = useState(0);
  const [diasTotaisAtivos, setDiasTotaisAtivos] = useState(0);
  const [carregando, setCarregando] = useState(true);
  // Token da leitura em curso: se outra começar (troca de uid ou recarregar
  // manual), a anterior descarta o próprio resultado ao terminar.
  const leituraRef = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;

    const [dailyLogs, estado] = await Promise.all([
      buscarUltimosDailyLogs(uid, DIAS_HISTORICO),
      buscarEstadoStreak(uid),
    ]);

    if (leituraRef.current !== leitura) {
      return;
    }

    setHistorico(construirHistoricoSemana(dailyLogs, new Date()));
    setStreakAtual(estado?.streakAtual ?? 0);
    setDiasTotaisAtivos(estado?.diasTotaisAtivos ?? 0);
    setCarregando(false);
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

  return { historico, streakAtual, diasTotaisAtivos, carregando, recarregar };
}
