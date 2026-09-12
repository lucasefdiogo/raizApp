import { useCallback, useRef, useState } from 'react';
import { avaliarStatusHistoricoDia, StatusHistoricoDia } from '../domain/progress';
import { buscarDailyLog } from '../services/firestore';
import { Tarefa } from '../domain/types';

interface UseDayDetailResultado {
  /** Data (YYYY-MM-DD) do dia atualmente selecionado, ou null se nenhum. */
  dataSelecionada: string | null;
  tarefasDoDia: Tarefa[];
  statusDoDia: StatusHistoricoDia | null;
  carregando: boolean;
  /** Busca o dailyLog daquele dia e passa a exibi-lo — troca a seleção
   * anterior, se houver (só um painel aberto por vez). */
  buscarDia: (data: string) => Promise<void>;
  /** Fecha o painel (equivalente a nenhuma pastilha selecionada). */
  limparSelecao: () => void;
}

/**
 * Detalhe read-only de um dia do histórico de Progresso (ver
 * ProgressoScreen) — busca o dailyLog exato ao tocar numa pastilha.
 * statusDoDia é recalculado aqui via avaliarStatusHistoricoDia
 * (domain/progress.ts), a mesma regra que já monta o histórico da semana,
 * pra não divergir do status já mostrado na própria pastilha.
 */
export function useDayDetail(uid: string): UseDayDetailResultado {
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [tarefasDoDia, setTarefasDoDia] = useState<Tarefa[]>([]);
  const [statusDoDia, setStatusDoDia] = useState<StatusHistoricoDia | null>(
    null,
  );
  const [carregando, setCarregando] = useState(false);
  // Token da leitura em curso: tocar noutra pastilha antes da anterior
  // resolver descarta o resultado desatualizado.
  const leituraRef = useRef(0);

  const buscarDia = useCallback(
    async (data: string) => {
      const leitura = ++leituraRef.current;
      setDataSelecionada(data);
      setCarregando(true);

      const log = await buscarDailyLog(uid, data);

      if (leituraRef.current !== leitura) {
        return;
      }
      setTarefasDoDia(log?.tarefas ?? []);
      setStatusDoDia(avaliarStatusHistoricoDia(log, data, new Date()));
      setCarregando(false);
    },
    [uid],
  );

  const limparSelecao = useCallback(() => {
    leituraRef.current++;
    setDataSelecionada(null);
    setTarefasDoDia([]);
    setStatusDoDia(null);
    setCarregando(false);
  }, []);

  return {
    dataSelecionada,
    tarefasDoDia,
    statusDoDia,
    carregando,
    buscarDia,
    limparSelecao,
  };
}
