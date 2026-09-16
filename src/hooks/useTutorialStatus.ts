import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, lerItem, salvarItem } from '../utils/storage';
import { logTutorialConcluido } from '../services/analytics';

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

  // `concluiuTudo` (repassado do TutorialScreen): só dispara o evento de
  // analytics quando a pessoa terminou o último slide, não quando pulou.
  const marcarTutorialVisto = useCallback(async (concluiuTudo: boolean) => {
    await salvarItem(STORAGE_KEYS.tutorialVisto, true);
    setTutorialVisto(true);
    if (concluiuTudo) {
      logTutorialConcluido();
    }
  }, []);

  return { carregando, tutorialVisto, marcarTutorialVisto };
}
