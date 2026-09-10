import { useCallback, useEffect, useState } from 'react';
import { FocoProcrastinacao, OnboardingData } from '../domain/types';
import { passoInicialOnboarding, PASSO_ONBOARDING } from '../domain/onboarding';
import { atualizarDadosOnboarding, buscarUsuario } from '../services/firestore';

type DadosOnboardingExistentes = Pick<
  OnboardingData,
  'focoProcrastinacao' | 'tempoTelaEstimado' | 'porqueTexto'
>;

const DADOS_VAZIOS: DadosOnboardingExistentes = {
  focoProcrastinacao: null,
  tempoTelaEstimado: null,
  porqueTexto: '',
};

interface UseOnboardingProgressResultado {
  /** Passo em que o wizard deve retomar, com base no que já existe no Firestore. */
  passoInicial: number;
  /** O que já foi respondido antes (pra pré-preencher os passos ao retomar). */
  dadosExistentes: DadosOnboardingExistentes;
  carregando: boolean;
  salvarFoco: (foco: FocoProcrastinacao) => Promise<void>;
  salvarTempoTela: (horas: number) => Promise<void>;
  salvarPorque: (texto: string) => Promise<void>;
}

/**
 * Lê users/{uid} (mesma fonte de buscarUsuario que useAuth/useStreak/
 * usePerfil usam) e diz em qual passo o onboarding retoma se o app foi
 * fechado no meio. As funções de salvar gravam campo a campo com merge e
 * só resolvem depois de confirmado — as telas navegam depois disso, nunca
 * de forma otimista (perder o dado por falha de rede seria pior que um
 * pequeno atraso).
 */
export function useOnboardingProgress(
  uid: string,
): UseOnboardingProgressResultado {
  const [passoInicial, setPassoInicial] = useState<number>(
    PASSO_ONBOARDING.foco,
  );
  const [dadosExistentes, setDadosExistentes] =
    useState<DadosOnboardingExistentes>(DADOS_VAZIOS);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const usuario = await buscarUsuario(uid);
      if (cancelado) {
        return;
      }

      const existentes: DadosOnboardingExistentes = {
        focoProcrastinacao: usuario?.focoProcrastinacao ?? null,
        tempoTelaEstimado: usuario?.tempoTelaEstimado ?? null,
        porqueTexto: usuario?.porqueTexto ?? '',
      };

      setDadosExistentes(existentes);
      setPassoInicial(passoInicialOnboarding(existentes));
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid]);

  const salvarFoco = useCallback(
    (foco: FocoProcrastinacao) =>
      atualizarDadosOnboarding(uid, { focoProcrastinacao: foco }),
    [uid],
  );

  const salvarTempoTela = useCallback(
    (horas: number) => atualizarDadosOnboarding(uid, { tempoTelaEstimado: horas }),
    [uid],
  );

  const salvarPorque = useCallback(
    (texto: string) =>
      atualizarDadosOnboarding(uid, { porqueTexto: texto.trim() }),
    [uid],
  );

  return {
    passoInicial,
    dadosExistentes,
    carregando,
    salvarFoco,
    salvarTempoTela,
    salvarPorque,
  };
}
