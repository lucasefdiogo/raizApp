import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EstadoSaldo,
  avisoUmMinutoAtivo,
  duracaoPausaIntencaoSeg,
  msRestantes,
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
 * (tarefa extra concluída → snapshot → nativo credita; cooldown vencendo) —
 * só nelas vale reler o nativo a cada tick. A sessão ativa só relê quando o
 * tempo acaba (ver o tick abaixo).
 */
const FASES_COM_POLLING: EstadoSaldo['fase'][] = [
  'SALDO_ZERADO',
  'COOLDOWN',
];

interface UseBloqueioSaldoResultado {
  /** null só se o nativo não respondeu e não havia visão inicial (não deveria acontecer no device). */
  visao: VisaoBloqueio | null;
  /** Relógio do aparelho, atualizado a cada segundo — base das contagens regressivas. */
  agora: number;
  /** Duração da pausa de intenção da PRÓXIMA sessão (10/20/30/40/50/60s). */
  pausaIntencaoSeg: number;
  /** false em SALDO_ZERADO (e fora de AGUARDANDO_LIBERACAO): não há pausa nem sessão a oferecer. */
  podeLiberar: boolean;
  /** Ms que faltam à sessão ativa (0 fora de SESSAO_ATIVA). */
  msRestantesSessao: number;
  /** Ms que faltam ao cooldown (0 fora de COOLDOWN). */
  msRestantesCooldown: number;
  /** Sessão ativa com 1 minuto ou menos restante. */
  avisoUmMinuto: boolean;
  /** @deprecated compat temporário — removido na TASK-08. */
  podeTolerancia: boolean;
  recarregar: () => Promise<void>;
  /** Fim da pausa: abre o bloco e grava o resumo do dia (bloco + intenção, se digitada). Resolve se abriu. */
  liberar: (intencao: string) => Promise<boolean>;
  /** @deprecated compat temporário — removido na TASK-08. Resolve false (a tolerância não existe mais). */
  aceitarTolerancia: () => Promise<boolean>;
  /** @deprecated compat temporário — removido na TASK-08. */
  recusarTolerancia: () => Promise<boolean>;
}

/**
 * Ponte da InterceptScreen com o saldo diário de blocos. A regra vive no
 * nativo (SaldoBloqueioMaquina.kt) — aqui só lê o estado, dispara as ações e
 * grava o resumo do dia no Firestore (sessões, intenções) pra
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
  const visaoRef = useRef(visao);
  visaoRef.current = visao;

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
      const atual = visaoRef.current;
      const sessaoAcabou =
        fase === 'SESSAO_ATIVA' &&
        !!atual &&
        msRestantes(atual.estado, resolverConfigBloco(atual.config), Date.now()) === 0;
      if (sessaoAcabou || (fase && FASES_COM_POLLING.includes(fase))) {
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
        gravarResumo({ sessoesUsadas: 1, intencao: intencao.trim() });
      }
      await recarregar();
      return ok;
    },
    [gravarResumo, recarregar],
  );

  const aceitarTolerancia = useCallback(async () => {
    const ok = await usarTolerancia();
    await recarregar();
    return ok;
  }, [recarregar]);

  const recusarTolerancia = useCallback(async () => {
    const ok = await recusarToleranciaNativo();
    await recarregar();
    return ok;
  }, [recarregar]);

  const config = visao ? resolverConfigBloco(visao.config) : null;

  const estado = visao?.estado;

  return {
    visao,
    agora,
    pausaIntencaoSeg: duracaoPausaIntencaoSeg(estado?.blocosUsados ?? 0),
    podeLiberar: estado?.fase === 'AGUARDANDO_LIBERACAO',
    msRestantesSessao: estado && config ? msRestantes(estado, config, agora) : 0,
    msRestantesCooldown:
      estado?.fase === 'COOLDOWN' ? Math.max(0, estado.fimCooldownEm - agora) : 0,
    avisoUmMinuto: !!estado && !!config && avisoUmMinutoAtivo(estado, config, agora),
    podeTolerancia: !!visao && !!config && toleranciaDisponivel(visao.estado, config),
    recarregar,
    liberar,
    aceitarTolerancia,
    recusarTolerancia,
  };
}
