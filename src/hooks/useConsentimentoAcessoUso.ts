import { useCallback } from 'react';
import { hojeISOLocal } from '../domain/data';
import { registrarConsentimentoAcessoUso } from '../services/firestore';
import { abrirConfiguracoesAcessoUso } from '../native/UsoApps';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';

const MENSAGEM_FALHA = 'Não conseguimos registrar seu consentimento agora. Tente de novo.';

interface UseConsentimentoAcessoUsoResultado {
  /**
   * Grava `consentimentoAcessoUso` com a data de hoje e só então abre as
   * configurações de acesso de uso (HU-02, RN-07). Resolve `true` se gravou;
   * `false` se falhou (toast disparado, configurações não abrem).
   */
  permitir: () => Promise<boolean>;
}

export function useConsentimentoAcessoUso(uid: string): UseConsentimentoAcessoUsoResultado {
  const { showToast } = useToast();

  const permitir = useCallback(async (): Promise<boolean> => {
    try {
      await registrarConsentimentoAcessoUso(uid, hojeISOLocal());
      abrirConfiguracoesAcessoUso();
      return true;
    } catch (erro) {
      registrarErro(erro as Error, 'useConsentimentoAcessoUso.permitir');
      showToast(MENSAGEM_FALHA);
      return false;
    }
  }, [uid, showToast]);

  return { permitir };
}
