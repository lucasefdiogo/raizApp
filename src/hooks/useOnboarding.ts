import { useCallback, useMemo, useState } from 'react';
import { FocoProcrastinacao, OnboardingData } from '../domain/types';
import {
  validarFocoProcrastinacao,
  validarPorqueTexto,
  validarTempoTelaEstimado,
} from '../domain/onboarding';
import { STORAGE_KEYS, salvarItem } from '../utils/storage';
import { salvarOnboardingUsuario } from '../services/firestore';

const DADOS_INICIAIS: OnboardingData = {
  porqueTexto: '',
  focoProcrastinacao: null,
  tempoTelaEstimado: null,
};

export const TOTAL_PASSOS_ONBOARDING = 3;

interface UseOnboardingParams {
  uid: string;
  onConcluir: () => void;
}

export function useOnboarding({ uid, onConcluir }: UseOnboardingParams) {
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState<OnboardingData>(DADOS_INICIAIS);
  const [salvando, setSalvando] = useState(false);

  const podeAvancar = useMemo(() => {
    if (passo === 0) {
      return validarPorqueTexto(dados.porqueTexto);
    }
    if (passo === 1) {
      return validarFocoProcrastinacao(dados.focoProcrastinacao);
    }
    return validarTempoTelaEstimado(dados.tempoTelaEstimado);
  }, [passo, dados]);

  const definirPorqueTexto = useCallback((texto: string) => {
    setDados(atual => ({ ...atual, porqueTexto: texto }));
  }, []);

  const definirFoco = useCallback((foco: FocoProcrastinacao) => {
    setDados(atual => ({ ...atual, focoProcrastinacao: foco }));
  }, []);

  const definirTempoTela = useCallback((horas: number) => {
    setDados(atual => ({ ...atual, tempoTelaEstimado: horas }));
  }, []);

  const voltar = useCallback(() => {
    setPasso(atual => Math.max(0, atual - 1));
  }, []);

  const avancar = useCallback(async () => {
    if (!podeAvancar) {
      return;
    }
    if (passo < TOTAL_PASSOS_ONBOARDING - 1) {
      setPasso(atual => atual + 1);
      return;
    }
    setSalvando(true);
    try {
      await salvarItem(STORAGE_KEYS.onboarding, dados);
      await salvarOnboardingUsuario(uid, dados);
      onConcluir();
    } finally {
      setSalvando(false);
    }
  }, [podeAvancar, passo, dados, uid, onConcluir]);

  return {
    passo,
    totalPassos: TOTAL_PASSOS_ONBOARDING,
    dados,
    podeAvancar,
    salvando,
    definirPorqueTexto,
    definirFoco,
    definirTempoTela,
    avancar,
    voltar,
  };
}
