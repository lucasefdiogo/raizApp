import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReflexaoSemanalDados,
  ResumoCardSemana,
  montarResumoCard,
  reflexaoSemanal,
} from '../domain/resumoRedes';
import { inicioDaSemana } from '../domain/streak';
import { paraISOLocal } from '../domain/data';
import { buscarDailyLogsNoIntervalo, buscarUsuario } from '../services/firestore';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';
import { useRecarregarAoReganharFoco } from './useRecarregarAoReganharFoco';

const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';

const RESUMO_VAZIO: ResumoCardSemana = {
  contadores: { sessoesUsadas: 0, acessosRapidos: 0, emergencias: 0 },
  duracaoTotal: '',
  barras: [],
  comparacao: null,
};

interface UseResumoRedesResultado {
  resumoCard: ResumoCardSemana;
  /** Já considera consentimento + base de dados (RN10) — null quando não deve aparecer. */
  reflexao: ReflexaoSemanalDados | null;
  /** users/{uid}.consentimentoAcessoUso preenchido — não o status nativo de permissão. */
  comAcessoDeUso: boolean;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

function inicioDaSemanaAnteriorISO(hoje: Date): string {
  const inicioAtual = inicioDaSemana(hoje);
  return paraISOLocal(
    new Date(inicioAtual.getFullYear(), inicioAtual.getMonth(), inicioAtual.getDate() - 7),
  );
}

/**
 * Lê os dailyLogs da segunda da semana anterior até hoje (RN01, no máximo
 * 14 documentos via buscarDailyLogsNoIntervalo) e o consentimento de acesso
 * de uso (users/{uid}.consentimentoAcessoUso — campo gravado, não o status
 * nativo de permissão), e devolve os dados já prontos pro ResumoRedesCard e
 * pra ReflexaoSemanalSheet. Não escreve nada (RN13).
 */
export function useResumoRedes(uid: string): UseResumoRedesResultado {
  const { showToast } = useToast();
  const [resumoCard, setResumoCard] = useState<ResumoCardSemana>(RESUMO_VAZIO);
  const [reflexao, setReflexao] = useState<ReflexaoSemanalDados | null>(null);
  const [comAcessoDeUso, setComAcessoDeUso] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const leituraRef = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;
    const hoje = new Date();
    const inicioAtualISO = paraISOLocal(inicioDaSemana(hoje));
    const inicioAnteriorISO = inicioDaSemanaAnteriorISO(hoje);

    const [logs, usuario] = await Promise.all([
      buscarDailyLogsNoIntervalo(uid, inicioAnteriorISO, paraISOLocal(hoje)),
      buscarUsuario(uid),
    ]);

    if (leituraRef.current !== leitura) {
      return;
    }

    const comAcessoDeUso = !!usuario?.consentimentoAcessoUso;
    const logsSemanaAtual = logs.filter(log => log.data >= inicioAtualISO);
    const logsSemanaAnterior = logs.filter(log => log.data < inicioAtualISO);

    setResumoCard(montarResumoCard(logsSemanaAtual, logsSemanaAnterior, comAcessoDeUso, hoje));
    setReflexao(comAcessoDeUso ? reflexaoSemanal(logsSemanaAnterior, hoje) : null);
    setComAcessoDeUso(comAcessoDeUso);
    setCarregando(false);
  }, [uid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregar = useCallback(async () => {
    try {
      await carregar();
    } catch (erro) {
      registrarErro(erro as Error, 'useResumoRedes.recarregar');
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  useRecarregarAoReganharFoco(recarregar);

  return { resumoCard, reflexao, comAcessoDeUso, carregando, recarregar };
}
