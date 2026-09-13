import { useCallback, useEffect, useState } from 'react';
import { OnboardingData } from '../domain/types';
import { onboardingEstaCompleto } from '../domain/onboarding';
import { STORAGE_KEYS, lerItem } from '../utils/storage';
import { buscarUsuario } from '../services/firestore';

/**
 * Considera o onboarding completo se o rascunho local já está válido
 * (resposta otimista, cobre o instante entre terminar o wizard e a escrita
 * no Firestore confirmar — só é gravado ao final do passo de primeira
 * tarefa, não mais ao final do porquê) OU se
 * users/{uid}.onboardingConcluido já é true no Firestore (fonte de
 * verdade entre sessões/dispositivos). Não usa mais `porqueTexto`: ele
 * virou só mais um passo intermediário (foco/tempoTela/porquê/
 * primeiraTarefa), preenchê-lo não basta pra sair do onboarding.
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
      completoRemoto = !!usuario?.onboardingConcluido;
    }

    setCompleto(completoLocal || completoRemoto);
    setCarregando(false);
  }, [uid]);

  useEffect(() => {
    verificar();
  }, [verificar]);

  return { carregando, completo, marcarComoCompleto: () => setCompleto(true) };
}
