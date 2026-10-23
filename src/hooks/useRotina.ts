import { useCallback, useEffect, useMemo, useState } from 'react';
import { paraISOLocal } from '../domain/data';
import { DiaRotina, estimarRotina } from '../domain/rotina';
import { DailyLog, Rotina } from '../domain/types';
import {
  buscarUltimosDailyLogs,
  buscarUsuario,
  confirmarRotina,
  editarHorarioRotinaManual,
  recalcularRotinaAutomatica,
  salvarAlternativaNoturna,
} from '../services/firestore';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';

// Janela de leitura: folga sobre os 5 dias mínimos da estimativa (RN-03).
const DIAS_LIDOS = 14;

const MENSAGEM_FALHA =
  'Não conseguimos salvar sua rotina agora. Tente de novo.';

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

/**
 * Rotina noturna (HU-06): lê users/{uid}.rotina e os últimos dailyLogs,
 * estima dormir/acordar (RN-03) e expõe quando mostrar a confirmação
 * (RN-04), a pergunta da alternativa (RN-06) e as ações de edição (RN-12).
 */
export function useRotina(uid: string): UseRotinaResultado {
  const { showToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [dias, setDias] = useState<DiaRotina[]>([]);
  const [perguntarAlternativa, setPerguntarAlternativa] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [usuario, logs] = await Promise.all([
        buscarUsuario(uid),
        buscarUltimosDailyLogs(uid, DIAS_LIDOS),
      ]);
      if (!cancelado) {
        setRotina(usuario?.rotina ?? null);
        setDias(logs.map(paraDiaRotina));
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

  const mostrarConfirmacao = estimativa !== null && !rotina?.confirmadoEm;

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
        setRotina(atual => ({
          ...atual,
          ...escolhidos,
          confirmadoEm,
          modoManual: ajustado,
        }));
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
        setRotina(atual =>
          atual ? { ...atual, alternativaNoturna: texto } : atual,
        );
        setPerguntarAlternativa(false);
      }
    },
    [uid, executar],
  );

  const dispensarAlternativa = useCallback(() => {
    setPerguntarAlternativa(false);
  }, []);

  const editarHorarioManual = useCallback(
    async (campos: Partial<Horarios>) => {
      const gravou = await executar('editarHorarioManual', () =>
        editarHorarioRotinaManual(uid, campos),
      );
      if (gravou) {
        setRotina(atual =>
          atual ? { ...atual, ...campos, modoManual: true } : atual,
        );
      }
    },
    [uid, executar],
  );

  const recalcularAutomaticamente = useCallback(async () => {
    const gravou = await executar('recalcularAutomaticamente', () =>
      recalcularRotinaAutomatica(uid),
    );
    if (gravou) {
      setRotina(atual => (atual ? { ...atual, modoManual: false } : atual));
    }
  }, [uid, executar]);

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
  };
}
