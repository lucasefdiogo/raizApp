import { useCallback, useEffect, useState } from 'react';
import {
  adicionarTarefaAoDailyLog,
  atualizarStatusStreak,
  buscarSystemMessage,
  buscarUsuario,
} from '../services/firestore';

interface UseReturnAfterPauseResultado {
  porqueTexto: string;
  corpoComTexto: string;
  carregando: boolean;
  enviarTarefaInicial: (tituloTarefa: string) => Promise<void>;
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Busca o porquê do usuário e o corpo de systemMessages/retorno_pausa (com o
 * placeholder {{porqueTexto}} já substituído). enviarTarefaInicial grava a
 * tarefa escolhida em dailyLogs/{hoje} e só então reverte statusStreak para
 * 'ativo' — a reversão do estado de pausa pertence a este fluxo, não a
 * domain/streak.ts.
 */
export function useReturnAfterPause(
  uid: string,
): UseReturnAfterPauseResultado {
  const [porqueTexto, setPorqueTexto] = useState('');
  const [corpoComTexto, setCorpoComTexto] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [usuario, mensagem] = await Promise.all([
        buscarUsuario(uid),
        buscarSystemMessage('retorno_pausa'),
      ]);

      if (cancelado) {
        return;
      }

      const porque = usuario?.porqueTexto ?? '';
      setPorqueTexto(porque);
      setCorpoComTexto((mensagem?.corpo ?? '').replace('{{porqueTexto}}', porque));
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid]);

  const enviarTarefaInicial = useCallback(
    async (tituloTarefa: string) => {
      const hojeISO = paraISO(new Date());
      await adicionarTarefaAoDailyLog(uid, hojeISO, {
        id: `inicial-${Date.now()}`,
        titulo: tituloTarefa,
        essencial: true,
        concluida: false,
      });
      await atualizarStatusStreak(uid, 'ativo');
    },
    [uid],
  );

  return { porqueTexto, corpoComTexto, carregando, enviarTarefaInicial };
}
