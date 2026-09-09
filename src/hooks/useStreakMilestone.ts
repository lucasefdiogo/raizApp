import { useCallback, useEffect, useState } from 'react';
import { buscarSystemMessage } from '../services/firestore';

interface UseStreakMilestoneResultado {
  marcoParaExibir: number | null;
  corpoParaExibir: string;
  limparMarcoExibido: () => void;
}

/**
 * Busca o texto de celebração em systemMessages/marco_{N} quando o streak
 * cruza um marco novo. Não escreve nada no Firestore — marcosAtingidos já
 * foi persistido pelo useStreak como parte do cálculo diário, antes de
 * marcoAtingido chegar a ser exposto. limparMarcoExibido só derruba o
 * estado local (fecha o modal); não há escrita duplicada a evitar.
 */
export function useStreakMilestone(
  marcoAtingido: number | null,
): UseStreakMilestoneResultado {
  const [marcoParaExibir, setMarcoParaExibir] = useState<number | null>(null);
  const [corpoParaExibir, setCorpoParaExibir] = useState('');

  useEffect(() => {
    if (marcoAtingido === null) {
      return;
    }

    let cancelado = false;

    async function buscar() {
      const mensagem = await buscarSystemMessage(`marco_${marcoAtingido}`);
      if (!cancelado) {
        setCorpoParaExibir(mensagem?.corpo ?? '');
        setMarcoParaExibir(marcoAtingido);
      }
    }

    buscar();

    return () => {
      cancelado = true;
    };
  }, [marcoAtingido]);

  const limparMarcoExibido = useCallback(() => {
    setMarcoParaExibir(null);
  }, []);

  return { marcoParaExibir, corpoParaExibir, limparMarcoExibido };
}
