import { useCallback, useEffect, useMemo, useState } from 'react';
import { FocoProcrastinacao, OnboardingData } from '../domain/types';
import {
  PASSO_ONBOARDING,
  TOTAL_PASSOS_ONBOARDING,
  validarFocoProcrastinacao,
  validarPorqueTexto,
  validarTempoTelaEstimado,
} from '../domain/onboarding';
import { tituloTarefaValido } from '../domain/dailyTasks';
import { STORAGE_KEYS, salvarItem } from '../utils/storage';
import {
  adicionarTarefaAoDailyLog,
  marcarOnboardingConcluido,
} from '../services/firestore';
import { logOnboardingConcluido } from '../services/analytics';
import { registrarErro } from '../services/crashlytics';
import { useOnboardingProgress } from './useOnboardingProgress';
import { useToast } from './useToast';

const MENSAGEM_FALHA_ONBOARDING =
  'Não conseguimos salvar agora. Tente de novo.';

const DADOS_INICIAIS: OnboardingData = {
  porqueTexto: '',
  focoProcrastinacao: null,
  tempoTelaEstimado: null,
};

interface UseOnboardingParams {
  uid: string;
  onConcluir: () => void;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useOnboarding({ uid, onConcluir }: UseOnboardingParams) {
  const { showToast } = useToast();
  const progresso = useOnboardingProgress(uid);
  const [passo, setPasso] = useState<number | null>(null);
  const [dados, setDados] = useState<OnboardingData>(DADOS_INICIAIS);
  const [tituloPrimeiraTarefa, setTituloPrimeiraTarefa] = useState('');
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

  // Passo de primeira tarefa não usa avancar()/podeAvancar — tem dois
  // caminhos próprios (comecarComTarefa/pularPrimeiraTarefa), "Pular por
  // hoje" nunca depende de validação nenhuma.
  const podeComecar = useMemo(
    () => tituloTarefaValido(tituloPrimeiraTarefa),
    [tituloPrimeiraTarefa],
  );

  const definirPorqueTexto = useCallback((texto: string) => {
    setDados(atual => ({ ...atual, porqueTexto: texto }));
  }, []);

  const definirFoco = useCallback((foco: FocoProcrastinacao) => {
    setDados(atual => ({ ...atual, focoProcrastinacao: foco }));
  }, []);

  const definirTempoTela = useCallback((horas: number) => {
    setDados(atual => ({ ...atual, tempoTelaEstimado: horas }));
  }, []);

  const definirTituloPrimeiraTarefa = useCallback((titulo: string) => {
    setTituloPrimeiraTarefa(titulo);
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
      } else if (passo === PASSO_ONBOARDING.porque) {
        await progresso.salvarPorque(dados.porqueTexto);
        setPasso(PASSO_ONBOARDING.primeiraTarefa);
      }
    } catch (erro) {
      // Falha de rede não deve avançar — o passo atual continua e o toast
      // avisa que não salvou; o usuário toca de novo.
      registrarErro(erro as Error, 'useOnboarding.avancar');
      showToast(MENSAGEM_FALHA_ONBOARDING);
    } finally {
      setSalvando(false);
    }
  }, [passo, podeAvancar, salvando, dados, progresso, showToast]);

  // Ponto único de conclusão de fato do onboarding — chamado pelos dois
  // caminhos do passo de primeira tarefa (criar a tarefa ou pular), nunca
  // mais ao final do porquê (esse agora é só mais um passo intermediário).
  const concluirOnboarding = useCallback(async () => {
    await marcarOnboardingConcluido(uid);
    // Resposta otimista local — cobre o instante entre terminar o wizard e
    // a escrita no Firestore confirmar (ver useOnboardingStatus).
    await salvarItem(STORAGE_KEYS.onboarding, {
      porqueTexto: dados.porqueTexto.trim(),
      focoProcrastinacao: dados.focoProcrastinacao,
      tempoTelaEstimado: dados.tempoTelaEstimado,
    });
    logOnboardingConcluido();
    onConcluir();
  }, [uid, dados, onConcluir]);

  const comecarComTarefa = useCallback(async () => {
    if (!podeComecar || salvando) {
      return;
    }
    setSalvando(true);
    try {
      await adicionarTarefaAoDailyLog(uid, hojeISO(), {
        id: `onboarding-${Date.now()}`,
        titulo: tituloPrimeiraTarefa.trim(),
        essencial: true,
        concluida: false,
      });
      await concluirOnboarding();
    } catch (erro) {
      registrarErro(erro as Error, 'useOnboarding.comecarComTarefa');
      showToast(MENSAGEM_FALHA_ONBOARDING);
    } finally {
      setSalvando(false);
    }
  }, [podeComecar, salvando, uid, tituloPrimeiraTarefa, concluirOnboarding, showToast]);

  const pularPrimeiraTarefa = useCallback(async () => {
    if (salvando) {
      return;
    }
    setSalvando(true);
    try {
      await concluirOnboarding();
    } catch (erro) {
      registrarErro(erro as Error, 'useOnboarding.pularPrimeiraTarefa');
      showToast(MENSAGEM_FALHA_ONBOARDING);
    } finally {
      setSalvando(false);
    }
  }, [salvando, concluirOnboarding, showToast]);

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
    tituloPrimeiraTarefa,
    definirTituloPrimeiraTarefa,
    podeComecar,
    comecarComTarefa,
    pularPrimeiraTarefa,
  };
}
