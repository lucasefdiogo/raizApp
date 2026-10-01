import { useCallback } from 'react';
import { hojeISOLocal } from '../domain/data';
import { registrarConsentimentoAcessibilidade } from '../services/firestore';
import { openAccessibilitySettings } from '../native/AccessibilityDetection';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';

const MENSAGEM_FALHA = 'Não conseguimos registrar seu consentimento agora. Tente de novo.';

interface UseConsentimentoAcessibilidadeResultado {
  /**
   * Grava o consentimento (com a data de hoje) e só então abre as
   * configurações de acessibilidade do Android — nessa ordem, nunca ao
   * contrário. Resolve `true` se gravou, `false` se falhou (toast já
   * disparado, configurações NÃO abrem nesse caso).
   */
  concordarEAtivar: () => Promise<boolean>;
}

/**
 * Orquestra o único efeito colateral permitido pela tela de divulgação em
 * destaque (DivulgacaoAcessibilidadeScreen): tocar "Concordo e quero
 * ativar" grava `users/{uid}.consentimentoAcessibilidade` ANTES de abrir a
 * tela de configurações do sistema — exigência de política da Play Store,
 * não só UX.
 */
export function useConsentimentoAcessibilidade(uid: string): UseConsentimentoAcessibilidadeResultado {
  const { showToast } = useToast();

  const concordarEAtivar = useCallback(async (): Promise<boolean> => {
    try {
      await registrarConsentimentoAcessibilidade(uid, hojeISOLocal());
      openAccessibilitySettings();
      return true;
    } catch (erro) {
      registrarErro(erro as Error, 'useConsentimentoAcessibilidade.concordarEAtivar');
      showToast(MENSAGEM_FALHA);
      return false;
    }
  }, [uid, showToast]);

  return { concordarEAtivar };
}
