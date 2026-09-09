import { useCallback, useEffect, useState } from 'react';
import { OnboardingData } from '../domain/types';
import { onboardingEstaCompleto } from '../domain/onboarding';
import { STORAGE_KEYS, lerItem } from '../utils/storage';

export function useOnboardingStatus() {
  const [carregando, setCarregando] = useState(true);
  const [completo, setCompleto] = useState(false);

  const verificar = useCallback(async () => {
    const dados = await lerItem<OnboardingData>(STORAGE_KEYS.onboarding);
    setCompleto(dados !== null && onboardingEstaCompleto(dados));
    setCarregando(false);
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  return { carregando, completo, marcarComoCompleto: () => setCompleto(true) };
}
