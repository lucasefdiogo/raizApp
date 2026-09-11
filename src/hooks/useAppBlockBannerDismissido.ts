import { useCallback, useEffect, useState } from 'react';
import { chaveAppBlockBannerDismissed, lerItem, salvarItem } from '../utils/storage';

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UseAppBlockBannerDismissidoResultado {
  dispensadoHoje: boolean;
  carregando: boolean;
  dispensarHoje: () => void;
}

/**
 * Dispensar o banner de descoberta do bloqueio de apps (Home) é por dia,
 * não permanente — mesmo padrão de chave por data já usado em
 * recovery_shown (useRecoveryState). Sem isso, quem dispensa uma vez nunca
 * mais descobre o recurso.
 */
export function useAppBlockBannerDismissido(): UseAppBlockBannerDismissidoResultado {
  const [dia] = useState(hojeISO);
  const [dispensadoHoje, setDispensadoHoje] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    lerItem<boolean>(chaveAppBlockBannerDismissed(dia)).then(valor => {
      if (cancelado) {
        return;
      }
      setDispensadoHoje(valor === true);
      setCarregando(false);
    });

    return () => {
      cancelado = true;
    };
  }, [dia]);

  const dispensarHoje = useCallback(() => {
    salvarItem(chaveAppBlockBannerDismissed(dia), true);
    setDispensadoHoje(true);
  }, [dia]);

  return { dispensadoHoje, carregando, dispensarHoje };
}
