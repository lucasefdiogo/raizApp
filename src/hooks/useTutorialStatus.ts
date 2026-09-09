import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, lerItem, salvarItem } from '../utils/storage';

export function useTutorialStatus() {
  const [carregando, setCarregando] = useState(true);
  const [tutorialVisto, setTutorialVisto] = useState(false);

  const verificar = useCallback(async () => {
    const visto = await lerItem<boolean>(STORAGE_KEYS.tutorialVisto);
    setTutorialVisto(visto === true);
    setCarregando(false);
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const marcarTutorialVisto = useCallback(async () => {
    await salvarItem(STORAGE_KEYS.tutorialVisto, true);
    setTutorialVisto(true);
  }, []);

  return { carregando, tutorialVisto, marcarTutorialVisto };
}
