import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EstadoSaldo,
  duracaoPausaIntencaoSeg,
  resolverConfigBloco,
  toleranciaDisponivel,
} from '../domain/saldoBloqueio';
import { hojeISOLocal } from '../domain/data';
import {
  VisaoBloqueio,
  liberarBloco,
  obterEstadoBloqueio,
  recusarTolerancia as recusarToleranciaNativo,
  usarTolerancia,
} from '../native/AccessibilityDetection';
import { registrarResumoBloqueioNoDia } from '../services/firestore';
import { registrarErro } from '../services/crashlytics';

/**
 * Fases em que o estado pode mudar sozinho por causa de algo fora desta tela
 * (essencial/tarefa extra concluída → snapshot → nativo credita; cooldown
 * vencendo) — só nelas vale reler o nativo a cada tick.
 */
const FASES_COM_POLLING: EstadoSaldo['fase'][] = [
  'BLOQUEADO_SEM_ESSENCIAL',
  'SALDO_ZERADO',
  'COOLDOWN',
];

interface UseBloqueioSaldoResultado {
  /** null só se o nativo não respondeu e não havia visão inicial (não deveria acontecer no device). */
  visao: VisaoBloqueio | null;
  /** Relógio do aparelho, atualizado a cada segundo — base das contagens regressivas. */
  agora: number;
  /** Duração da pausa de intenção do PRÓXIMO bloco (5/10/20/40/60s). */
  pausaIntencaoSeg: number;
  podeTolerancia: boolean;
  recarregar: () => Promise<void>;
  /** Fim da pausa: abre o bloco e grava o resumo do dia (bloco + intenção, se digitada). Resolve se abriu. */
  liberar: (intencao: string) => Promise<boolean>;
  /** "+N min para finalizar". Resolve se foi concedida. */
  aceitarTolerancia: () => Promise<boolean>;
  /** "Agora não" na oferta de tolerância. */
  recusarTolerancia: () => Promise<boolean>;
}

/**
 * Ponte da InterceptScreen com o saldo diário de blocos. A regra vive no
 * nativo (SaldoBloqueioMaquina.kt) — aqui só lê o estado, dispara as ações e
 * grava o resumo do dia no Firestore (blocos, tolerâncias, intenções) pra
 * estatísticas futuras. `visaoInicial` vem dos extras da InterceptActivity,
 * pra a primeira renderização não esperar o bridge.
 */
export function useBloqueioSaldo(
  uid: string,
  visaoInicial: VisaoBloqueio | null,
): UseBloqueioSaldoResultado {
  const [visao, setVisao] = useState<VisaoBloqueio | null>(visaoInicial);
  const [agora, setAgora] = useState(() => Date.now());
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const nova = await obterEstadoBloqueio();
      if (nova && montado.current) {
        setVisao(nova);
      }
    } catch (erro) {
      registrarErro(erro as Error, 'useBloqueioSaldo.recarregar');
    }
  }, []);

  const fase = visao?.estado.fase;
  useEffect(() => {
    // Recarrega logo ao montar: a visão inicial pode ter ficado velha entre o
    // Service montar o Intent e a tela aparecer.
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAgora(Date.now());
      if (fase && FASES_COM_POLLING.includes(fase)) {
        recarregar();
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [fase, recarregar]);

  const gravarResumo = useCallback(
    (parcial: Parameters<typeof registrarResumoBloqueioNoDia>[2]) => {
      (async () => {
        try {
          await registrarResumoBloqueioNoDia(uid, hojeISOLocal(), parcial);
        } catch (erro) {
          registrarErro(erro as Error, 'useBloqueioSaldo.gravarResumo');
        }
      })();
    },
    [uid],
  );

  const liberar = useCallback(
    async (intencao: string) => {
      const ok = await liberarBloco();
      if (ok) {
        gravarResumo({ blocosUsados: 1, intencao: intencao.trim() });
      }
      await recarregar();
      return ok;
    },
    [gravarResumo, recarregar],
  );

  const aceitarTolerancia = useCallback(async () => {
    const ok = await usarTolerancia();
    if (ok) {
      gravarResumo({ toleranciasUsadas: 1 });
    }
    await recarregar();
    return ok;
  }, [gravarResumo, recarregar]);

  const recusarTolerancia = useCallback(async () => {
    const ok = await recusarToleranciaNativo();
    await recarregar();
    return ok;
  }, [recarregar]);

  const config = visao ? resolverConfigBloco(visao.config) : null;

  return {
    visao,
    agora,
    pausaIntencaoSeg: duracaoPausaIntencaoSeg(visao?.estado.blocosUsados ?? 0),
    podeTolerancia: !!visao && !!config && toleranciaDisponivel(visao.estado, config),
    recarregar,
    liberar,
    aceitarTolerancia,
    recusarTolerancia,
  };
}
