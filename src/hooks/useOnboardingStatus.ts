import { useCallback, useEffect, useState } from 'react';
import { OnboardingData } from '../domain/types';
import { onboardingEstaCompleto } from '../domain/onboarding';
import { STORAGE_KEYS, lerItem } from '../utils/storage';
import { buscarUsuario } from '../services/firestore';

/**
 * Considera o onboarding completo se o rascunho local já está válido
 * (resposta otimista, cobre o instante entre terminar o wizard e a escrita
 * no Firestore confirmar) OU se users/{uid}.porqueTexto já está preenchido
 * no Firestore (fonte de verdade entre sessões/dispositivos).
 */
export function useOnboardingStatus(uid: string | null) {
  const [carregando, setCarregando] = useState(true);
  const [completo, setCompleto] = useState(false);

  const verificar = useCallback(async () => {
    const dadosLocais = await lerItem<OnboardingData>(STORAGE_KEYS.onboarding);
    const completoLocal =
      dadosLocais !== null && onboardingEstaCompleto(dadosLocais);

    let completoRemoto = false;
    if (uid) {
      const usuario = await buscarUsuario(uid);
      completoRemoto = !!usuario?.porqueTexto;
    }

    setCompleto(completoLocal || completoRemoto);
    setCarregando(false);
  }, [uid]);

  useEffect(() => {
    verificar();
  }, [verificar]);

  return { carregando, completo, marcarComoCompleto: () => setCompleto(true) };
}
