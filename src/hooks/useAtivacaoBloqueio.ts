import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, lerItem, salvarItem } from '../utils/storage';

interface UseAtivacaoBloqueioResultado {
  /**
   * true na primeira vez que o boot chega aqui sem
   * ativacao_bloqueio_mostrada gravado — quem chama deve mostrar o convite
   * de ativação do bloqueio, mesmo molde de deveExibirPriming
   * (useLocalNotifications).
   */
  deveExibirAtivacao: boolean;
  /** Grava a flag de qualquer forma — "Agora não" ou "Configurar" — pra nunca mais repetir. */
  concluirAtivacao: () => Promise<void>;
}

export function useAtivacaoBloqueio(
  uid: string | null,
  pronto: boolean,
): UseAtivacaoBloqueioResultado {
  const [deveExibirAtivacao, setDeveExibirAtivacao] = useState(false);

  useEffect(() => {
    if (!pronto || !uid) {
      return;
    }

    async function verificar() {
      const jaMostrada = await lerItem<boolean>(
        STORAGE_KEYS.ativacaoBloqueioMostrada,
      );
      if (!jaMostrada) {
        setDeveExibirAtivacao(true);
      }
    }

    verificar();
  }, [pronto, uid]);

  const concluirAtivacao = useCallback(async () => {
    await salvarItem(STORAGE_KEYS.ativacaoBloqueioMostrada, true);
    setDeveExibirAtivacao(false);
  }, []);

  return { deveExibirAtivacao, concluirAtivacao };
}
