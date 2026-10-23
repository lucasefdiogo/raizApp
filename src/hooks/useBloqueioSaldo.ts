import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EstadoSaldo,
  avisoUmMinutoAtivo,
  duracaoPausaIntencaoSeg,
  msRestantes,
  resolverConfigBloco,
} from '../domain/saldoBloqueio';
import { ACESSOS_RAPIDOS_DIARIOS } from '../domain/acessoRapido';
import { hojeISOLocal } from '../domain/data';
import { dentroDaJanelaNoturna } from '../domain/rotina';
import {
  VisaoBloqueio,
  ResultadoLiberacaoRapida,
  concluirEmergencia as concluirEmergenciaNativo,
  liberarAcessoRapido as liberarAcessoRapidoNativo,
  liberarBloco,
  obterEstadoBloqueio,
} from '../native/AccessibilityDetection';
import { buscarUsuario, registrarResumoBloqueioNoDia } from '../services/firestore';
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

/** Espera antes de liberar o acesso rápido (RN-01); fixa, sem campo de texto. */
const ESPERA_ACESSO_RAPIDO_SEG = 5;
/** Dentro da janela noturna, a espera do acesso rápido é fixa em 30s (HU-11, RN09). */
const ESPERA_ACESSO_RAPIDO_NOTURNA_SEG = 30;

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
  /** Há acesso rápido a usar agora (cota restante e intervalo cumprido). */
  acessoRapidoDisponivel: boolean;
  /** 5s fora da janela noturna, 30s dentro dela (HU-11, RN09). */
  esperaAcessoRapidoSeg: number;
  /** Acessos rápidos que ainda cabem hoje (default 3 sem o campo no nativo). */
  acessosRapidosRestantes: number;
  /** Ms até o próximo acesso rápido (0 = agora, ou cota esgotada: ver acessosRapidosRestantes). */
  msAteProximoAcessoRapido: number;
  /** A saída de emergência deve aparecer (RN-06). */
  emergenciaOferecida: boolean;
  /** Fim da espera de 5 s: abre 2 min de uso e conta no resumo do dia. Resolve se o nativo aceitou. */
  liberarAcessoRapido: () => Promise<boolean>;
  /** Fim da respiração de 60 s: abre 2 min sem gastar a cota e conta no resumo do dia. Resolve se aceitou. */
  concluirEmergencia: () => Promise<boolean>;
  recarregar: () => Promise<void>;
  /** Fim da pausa: abre o bloco e grava o resumo do dia (bloco + intenção, se digitada). Resolve se abriu. */
  liberar: (intencao: string) => Promise<boolean>;
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
  const [dentroJanelaNoturna, setDentroJanelaNoturna] = useState(false);
  const montado = useRef(true);
  const visaoRef = useRef(visao);
  visaoRef.current = visao;

  // Só decide a espera do acesso rápido (RN09) — a pausa de intenção
  // noturna já é calculada por usePausaNoturna, independente desta leitura.
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const usuario = await buscarUsuario(uid);
        if (ativo && usuario?.rotina) {
          setDentroJanelaNoturna(dentroDaJanelaNoturna(usuario.rotina, new Date()));
        }
      } catch (erro) {
        registrarErro(erro as Error, 'useBloqueioSaldo.janelaNoturna');
      }
    })();
    return () => {
      ativo = false;
    };
  }, [uid]);

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

  const executarLiberacaoRapida = useCallback(
    async (
      acao: () => Promise<ResultadoLiberacaoRapida>,
      contador: 'acessosRapidos' | 'emergencias',
    ) => {
      const { aceito, visao: nova } = await acao();
      if (nova && montado.current) {
        setVisao(nova);
      }
      if (aceito) {
        gravarResumo({ [contador]: 1 });
      }
      return aceito;
    },
    [gravarResumo],
  );

  const liberarAcessoRapido = useCallback(
    () => executarLiberacaoRapida(liberarAcessoRapidoNativo, 'acessosRapidos'),
    [executarLiberacaoRapida],
  );

  const concluirEmergencia = useCallback(
    () => executarLiberacaoRapida(concluirEmergenciaNativo, 'emergencias'),
    [executarLiberacaoRapida],
  );

  const acessosRapidosRestantes = visao?.acessosRapidosRestantes ?? ACESSOS_RAPIDOS_DIARIOS;
  const msAteProximoAcessoRapido = visao?.msAteProximoAcessoRapido ?? 0;

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
    acessoRapidoDisponivel: acessosRapidosRestantes > 0 && msAteProximoAcessoRapido === 0,
    esperaAcessoRapidoSeg: dentroJanelaNoturna
      ? ESPERA_ACESSO_RAPIDO_NOTURNA_SEG
      : ESPERA_ACESSO_RAPIDO_SEG,
    acessosRapidosRestantes,
    msAteProximoAcessoRapido,
    emergenciaOferecida: visao?.emergenciaOferecida ?? false,
    liberarAcessoRapido,
    concluirEmergencia,
    recarregar,
    liberar,
  };
}
