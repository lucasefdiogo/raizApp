import { useCallback, useEffect, useMemo, useState } from 'react';
import { FocoProcrastinacao, OnboardingData } from '../domain/types';
import {
  PASSO_ONBOARDING,
  TOTAL_PASSOS_ONBOARDING,
  validarFocoProcrastinacao,
  validarPorqueTexto,
  validarTempoTelaEstimado,
} from '../domain/onboarding';
import { STORAGE_KEYS, salvarItem } from '../utils/storage';
import { useOnboardingProgress } from './useOnboardingProgress';

const DADOS_INICIAIS: OnboardingData = {
  porqueTexto: '',
  focoProcrastinacao: null,
  tempoTelaEstimado: null,
};

interface UseOnboardingParams {
  uid: string;
  onConcluir: () => void;
}

export function useOnboarding({ uid, onConcluir }: UseOnboardingParams) {
  const progresso = useOnboardingProgress(uid);
  const [passo, setPasso] = useState<number | null>(null);
  const [dados, setDados] = useState<OnboardingData>(DADOS_INICIAIS);
  const [salvando, setSalvando] = useState(false);

  // Assim que o Firestore responde, retoma no passo certo e pré-preenche o
  // que já tinha sido respondido antes.
  useEffect(() => {
    if (progresso.carregando || passo !== null) {
      return;
    }
    setPasso(progresso.passoInicial);
    setDados({
      porqueTexto: progresso.dadosExistentes.porqueTexto,
      focoProcrastinacao: progresso.dadosExistentes.focoProcrastinacao,
      tempoTelaEstimado: progresso.dadosExistentes.tempoTelaEstimado,
    });
  }, [
    progresso.carregando,
    progresso.passoInicial,
    progresso.dadosExistentes,
    passo,
  ]);

  const carregando = progresso.carregando || passo === null;

  const podeAvancar = useMemo(() => {
    if (passo === PASSO_ONBOARDING.foco) {
      return validarFocoProcrastinacao(dados.focoProcrastinacao);
    }
    if (passo === PASSO_ONBOARDING.tempoTela) {
      return validarTempoTelaEstimado(dados.tempoTelaEstimado);
    }
    if (passo === PASSO_ONBOARDING.porque) {
      return validarPorqueTexto(dados.porqueTexto);
    }
    return false;
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
    setPasso(atual => Math.max(PASSO_ONBOARDING.foco, (atual ?? 0) - 1));
  }, []);

  const avancar = useCallback(async () => {
    if (passo === null || !podeAvancar || salvando) {
      return;
    }

    setSalvando(true);
    try {
      if (passo === PASSO_ONBOARDING.foco) {
        await progresso.salvarFoco(dados.focoProcrastinacao!);
        setPasso(PASSO_ONBOARDING.tempoTela);
      } else if (passo === PASSO_ONBOARDING.tempoTela) {
        await progresso.salvarTempoTela(dados.tempoTelaEstimado!);
        setPasso(PASSO_ONBOARDING.porque);
      } else {
        await progresso.salvarPorque(dados.porqueTexto);
        await salvarItem(STORAGE_KEYS.onboarding, {
          porqueTexto: dados.porqueTexto.trim(),
          focoProcrastinacao: dados.focoProcrastinacao,
          tempoTelaEstimado: dados.tempoTelaEstimado,
        });
        onConcluir();
      }
    } catch {
      // Falha de rede não deve avançar — o passo atual continua, o usuário
      // toca de novo. Sem tratamento visual dedicado nesta etapa.
    } finally {
      setSalvando(false);
    }
  }, [passo, podeAvancar, salvando, dados, progresso, onConcluir]);

  return {
    passo: passo ?? progresso.passoInicial,
    totalPassos: TOTAL_PASSOS_ONBOARDING,
    dados,
    podeAvancar,
    salvando,
    carregando,
    definirPorqueTexto,
    definirFoco,
    definirTempoTela,
    avancar,
    voltar,
  };
}
