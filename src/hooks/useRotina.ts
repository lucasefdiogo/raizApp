import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dataDeAmanhaLocal, hojeISOLocal, paraISOLocal } from '../domain/data';
import { DiaRotina, estimarRotina } from '../domain/rotina';
import { DailyLog, Rotina } from '../domain/types';
import {
  aplicarEstimativaRotina,
  buscarUltimosDailyLogs,
  buscarUsuario,
  confirmarRotina,
  editarHorarioRotinaManual,
  recalcularRotinaAutomatica,
  salvarAlternativaNoturna,
} from '../services/firestore';
import { salvarRotina } from '../native/AccessibilityDetection';
import {
  logAlternativaNoturnaRespondida,
  logRotinaConfirmada,
  logRotinaRecalculoPedido,
} from '../services/analytics';
import { registrarErro } from '../services/crashlytics';
import { lerItem, salvarItem, STORAGE_KEYS } from '../utils/storage';
import { useToast } from './useToast';

// Janela de leitura: folga sobre os 5 dias mínimos da estimativa (RN-03).
const DIAS_LIDOS = 14;

const MENSAGEM_FALHA =
  'Não conseguimos salvar sua rotina agora. Tente de novo.';
const MENSAGEM_RECALCULO_PEDIDO =
  'Na próxima abertura, o horário volta a ser estimado.';

type Horarios = { dormirEstimado: string; acordarEstimado: string };

interface UseRotinaResultado {
  carregando: boolean;
  rotina: Rotina | null;
  estimativa: Horarios | null;
  /** Dias (dos últimos DIAS_LIDOS) com os dois horários coletados — usado por resumoRotina (RN11). */
  diasComDados: number;
  mostrarConfirmacao: boolean;
  perguntarAlternativa: boolean;
  confirmar: (horarios?: Horarios) => Promise<void>;
  salvarAlternativa: (texto: string) => Promise<void>;
  dispensarAlternativa: () => void;
  editarHorarioManual: (campos: Partial<Horarios>) => Promise<void>;
  recalcularAutomaticamente: () => Promise<void>;
  /** Sai sem decidir (HU-10, RN09): a confirmação só volta a aparecer amanhã. */
  adiar: () => void;
}

// usoApps guarda os horários como chaves string irmãs dos pacotes (TASK-02).
function paraDiaRotina(log: DailyLog): DiaRotina {
  const uso = (log.usoApps ?? {}) as unknown as Record<string, unknown>;
  const lerTexto = (chave: string) =>
    typeof uso[chave] === 'string' ? (uso[chave] as string) : undefined;
  return {
    primeiroUsoDia: lerTexto('primeiroUsoDia'),
    ultimoUsoAntesPausaLonga: lerTexto('ultimoUsoAntesPausaLonga'),
  };
}

/** Espelha no nativo só quando há `confirmadoEm` (HU-10, RN16). */
function espelharSeConfirmada(rotina: Rotina | null): void {
  if (rotina?.confirmadoEm) {
    salvarRotina(rotina);
  }
}

/**
 * Rotina noturna (HU-06): lê users/{uid}.rotina e os últimos dailyLogs,
 * estima dormir/acordar (RN-03) e expõe quando mostrar a confirmação
 * (RN-04), a pergunta da alternativa (RN-06) e as ações de edição (RN-12).
 * HU-10 acrescenta o adiamento (RN09), o espelho nativo e os eventos de
 * Analytics (RN16/RN18) e a reaplicação da estimativa após "Recalcular
 * automaticamente" (RN15).
 */
export function useRotina(uid: string): UseRotinaResultado {
  const { showToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [dias, setDias] = useState<DiaRotina[]>([]);
  const [perguntarAlternativa, setPerguntarAlternativa] = useState(false);
  const [adiadaAte, setAdiadaAte] = useState<string | null>(null);
  const [recalculoPendente, setRecalculoPendente] = useState(false);

  // Snapshot sempre atual de `rotina` — os setters abaixo espelham/logam o
  // resultado já calculado, então não podem depender do closure (estaria
  // sempre um passo atrás do estado real).
  const rotinaRef = useRef<Rotina | null>(null);
  useEffect(() => {
    rotinaRef.current = rotina;
  }, [rotina]);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [usuario, logs, adiada, pendente] = await Promise.all([
        buscarUsuario(uid),
        buscarUltimosDailyLogs(uid, DIAS_LIDOS),
        lerItem<string>(STORAGE_KEYS.rotinaConfirmacaoAdiada),
        lerItem<boolean>(STORAGE_KEYS.rotinaRecalculoPendente),
      ]);
      if (!cancelado) {
        setRotina(usuario?.rotina ?? null);
        setDias(logs.map(paraDiaRotina));
        setAdiadaAte(adiada);
        setRecalculoPendente(Boolean(pendente));
        setCarregando(false);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid]);

  const estimativa = useMemo(
    () => estimarRotina(dias, rotina?.modoManual ?? false),
    [dias, rotina?.modoManual],
  );

  const diasComDados = useMemo(
    () => dias.filter(d => d.primeiroUsoDia && d.ultimoUsoAntesPausaLonga).length,
    [dias],
  );

  const mostrarConfirmacao =
    estimativa !== null &&
    !rotina?.confirmadoEm &&
    (!adiadaAte || hojeISOLocal() >= adiadaAte);

  const executar = useCallback(
    async (contexto: string, acao: () => Promise<void>): Promise<boolean> => {
      try {
        await acao();
        return true;
      } catch (erro) {
        registrarErro(erro as Error, `useRotina.${contexto}`);
        showToast(MENSAGEM_FALHA);
        return false;
      }
    },
    [showToast],
  );

  const confirmar = useCallback(
    async (horarios?: Horarios) => {
      const ajustado = horarios !== undefined;
      const escolhidos = horarios ?? estimativa;
      if (!escolhidos) {
        return;
      }
      const confirmadoEm = paraISOLocal(new Date());
      const gravou = await executar('confirmar', () =>
        confirmarRotina(uid, escolhidos, confirmadoEm, ajustado),
      );
      if (gravou) {
        const novaRotina: Rotina = {
          ...rotinaRef.current,
          ...escolhidos,
          confirmadoEm,
          modoManual: ajustado,
        };
        setRotina(novaRotina);
        espelharSeConfirmada(novaRotina);
        logRotinaConfirmada(ajustado);
        setPerguntarAlternativa(true);
      }
    },
    [uid, estimativa, executar],
  );

  const salvarAlternativa = useCallback(
    async (texto: string) => {
      const gravou = await executar('salvarAlternativa', () =>
        salvarAlternativaNoturna(uid, texto),
      );
      if (gravou) {
        const atual = rotinaRef.current;
        const novaRotina = atual ? { ...atual, alternativaNoturna: texto } : atual;
        setRotina(novaRotina);
        espelharSeConfirmada(novaRotina);
        logAlternativaNoturnaRespondida('salvou');
        setPerguntarAlternativa(false);
      }
    },
    [uid, executar],
  );

  const dispensarAlternativa = useCallback(() => {
    logAlternativaNoturnaRespondida('agora_nao');
    setPerguntarAlternativa(false);
  }, []);

  const editarHorarioManual = useCallback(
    async (campos: Partial<Horarios>) => {
      const gravou = await executar('editarHorarioManual', () =>
        editarHorarioRotinaManual(uid, campos),
      );
      if (gravou) {
        const atual = rotinaRef.current;
        const novaRotina = atual ? { ...atual, ...campos, modoManual: true } : atual;
        setRotina(novaRotina);
        espelharSeConfirmada(novaRotina);
      }
    },
    [uid, executar],
  );

  const recalcularAutomaticamente = useCallback(async () => {
    const gravou = await executar('recalcularAutomaticamente', () =>
      recalcularRotinaAutomatica(uid),
    );
    if (gravou) {
      const atual = rotinaRef.current;
      const novaRotina = atual ? { ...atual, modoManual: false } : atual;
      setRotina(novaRotina);
      espelharSeConfirmada(novaRotina);
      await salvarItem(STORAGE_KEYS.rotinaRecalculoPendente, true);
      setRecalculoPendente(true);
      logRotinaRecalculoPedido();
      showToast(MENSAGEM_RECALCULO_PEDIDO);
    }
  }, [uid, executar, showToast]);

  const adiar = useCallback(() => {
    const amanha = dataDeAmanhaLocal(hojeISOLocal());
    salvarItem(STORAGE_KEYS.rotinaConfirmacaoAdiada, amanha);
    setAdiadaAte(amanha);
  }, []);

  // RN15: na abertura seguinte a "Recalcular automaticamente", se já houver
  // estimativa nova, ela substitui os horários uma vez — mantendo
  // confirmadoEm e sem reabrir a tela de confirmação. Fora desse caso
  // (recalculoPendente falso), a estimativa automática nunca toca numa
  // rotina já confirmada.
  useEffect(() => {
    if (carregando || !recalculoPendente || !estimativa) {
      return;
    }
    if (!rotina?.confirmadoEm || rotina.modoManual) {
      return;
    }

    let cancelado = false;

    (async () => {
      const gravou = await executar('aplicarEstimativaPendente', () =>
        aplicarEstimativaRotina(uid, estimativa),
      );
      if (gravou && !cancelado) {
        const novaRotina = { ...rotinaRef.current!, ...estimativa };
        setRotina(novaRotina);
        espelharSeConfirmada(novaRotina);
        await salvarItem(STORAGE_KEYS.rotinaRecalculoPendente, false);
        setRecalculoPendente(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [
    carregando,
    recalculoPendente,
    estimativa,
    rotina?.confirmadoEm,
    rotina?.modoManual,
    uid,
    executar,
  ]);

  return {
    carregando,
    rotina,
    estimativa,
    diasComDados,
    mostrarConfirmacao,
    perguntarAlternativa,
    confirmar,
    salvarAlternativa,
    dispensarAlternativa,
    editarHorarioManual,
    recalcularAutomaticamente,
    adiar,
  };
}
