import { useCallback, useEffect, useRef, useState } from 'react';
import {
  atualizarProgressoDesafio,
  buscarDailyLogsNoIntervalo,
  buscarDesafio,
  buscarDesafiosAtivos,
  buscarUsuario,
  criarDesafio,
} from '../services/firestore';
import {
  atingeMinimoParaProposta,
  calcularBaseSegundos,
  calcularProgressoReducao,
  diasRestantes,
  montarProposta,
  PropostaDesafioReducao,
  statusAoFechar,
  textoDiasRestantes,
  textoResultadoAnterior,
} from '../domain/desafioReducao';
import { formatarDuracao } from '../domain/resumoRedes';
import { inicioDaSemana } from '../domain/streak';
import { paraISOLocal } from '../domain/data';
import { Desafio } from '../domain/types';
import { logDesafioReducaoFechado, logDesafioReducaoRespondido } from '../services/analytics';
import { registrarErro } from '../services/crashlytics';
import { STORAGE_KEYS, lerItem, salvarItem } from '../utils/storage';
import { useToast } from './useToast';

const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';

export type DesafioReducaoAtivo = Desafio & {
  diasRestantesTexto: string;
  ultrapassou: boolean;
  semMedicaoDesde: string | null;
};

interface UseDesafioReducaoResultado {
  proposta: PropostaDesafioReducao | null;
  desafioAtivo: DesafioReducaoAtivo | null;
  resultadoAnteriorTexto: string | null;
  carregando: boolean;
  aceitar: () => Promise<void>;
  recusar: () => Promise<void>;
  recarregar: () => Promise<void>;
}

function fimDaSemana(inicio: Date): Date {
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
}

/**
 * Orquestra a proposta, o aceite, a recusa e o fechamento do desafio de
 * redução de tempo nas redes (domain/desafioReducao.ts) — inteiramente
 * isolado de useDesafios/calcularProgressoDesafio (catálogo automático).
 * `reflexaoVisivel` é a condição 1 da elegibilidade ("a reflexão já precisa
 * estar aparecendo") — ProgressoScreen já calcula isso via useResumoRedes,
 * evitando duplicar aqui a conta de dias/consentimento que reflexaoSemanal
 * já faz.
 */
export function useDesafioReducao(
  uid: string,
  reflexaoVisivel: boolean,
): UseDesafioReducaoResultado {
  const { showToast } = useToast();
  const [proposta, setProposta] = useState<PropostaDesafioReducao | null>(null);
  const [desafioAtivo, setDesafioAtivo] = useState<DesafioReducaoAtivo | null>(null);
  const [resultadoAnteriorTexto, setResultadoAnteriorTexto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const leituraRef = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;
    const hoje = new Date();
    const hojeISO = paraISOLocal(hoje);
    const inicioSemanaAtual = inicioDaSemana(hoje);
    const inicioSemanaAtualISO = paraISOLocal(inicioSemanaAtual);
    const inicioSemanaAnterior = new Date(
      inicioSemanaAtual.getFullYear(),
      inicioSemanaAtual.getMonth(),
      inicioSemanaAtual.getDate() - 7,
    );
    const inicioSemanaAnteriorISO = paraISOLocal(inicioSemanaAnterior);
    const fimSemanaAnteriorISO = paraISOLocal(fimDaSemana(inicioSemanaAnterior));

    const usuario = await buscarUsuario(uid);
    const appsBloqueados = usuario?.regrasBloqueio?.apps ?? [];
    // Mesma definição exata de `mostrarResumoDetalhado` em useResumoRedes.ts —
    // revogar o acesso de uso não some com os apps configurados.
    const comAcessoDeUso = !!usuario?.consentimentoAcessoUso && appsBloqueados.length > 0;

    const desafioAnterior = await buscarDesafio(
      uid,
      `reducao_tempo_redes-${inicioSemanaAnteriorISO}`,
    );

    const todosAtivos = await buscarDesafiosAtivos(uid);
    let desafioAtivoCru =
      todosAtivos.find(desafio => desafio.tipo === 'reducao_tempo_redes') ?? null;

    // Fechamento preguiçoso: cobre qualquer desafio de redução esquecido, não
    // só o da semana imediatamente anterior (ver dataFim vs hoje, nunca
    // "semana anterior" fixo).
    if (desafioAtivoCru && hojeISO > desafioAtivoCru.dataFim) {
      const logs = await buscarDailyLogsNoIntervalo(
        uid,
        desafioAtivoCru.dataInicio,
        desafioAtivoCru.dataFim,
      );
      const progresso = calcularProgressoReducao(
        desafioAtivoCru,
        logs,
        appsBloqueados,
        comAcessoDeUso,
      );
      const status = statusAoFechar(progresso.progressoSegundos, desafioAtivoCru.meta);
      await atualizarProgressoDesafio(
        uid,
        desafioAtivoCru.id,
        progresso.progressoSegundos,
        status,
      );
      logDesafioReducaoFechado(status);
      desafioAtivoCru = null;
    }

    if (leituraRef.current !== leitura) {
      return;
    }

    if (desafioAtivoCru) {
      const logs = await buscarDailyLogsNoIntervalo(
        uid,
        desafioAtivoCru.dataInicio,
        desafioAtivoCru.dataFim,
      );
      const progresso = calcularProgressoReducao(
        desafioAtivoCru,
        logs,
        appsBloqueados,
        comAcessoDeUso,
      );
      if (progresso.progressoSegundos !== desafioAtivoCru.progresso) {
        await atualizarProgressoDesafio(
          uid,
          desafioAtivoCru.id,
          progresso.progressoSegundos,
          desafioAtivoCru.status,
        );
      }
      if (leituraRef.current !== leitura) {
        return;
      }
      setDesafioAtivo({
        ...desafioAtivoCru,
        progresso: progresso.progressoSegundos,
        diasRestantesTexto: textoDiasRestantes(diasRestantes(hoje, desafioAtivoCru.dataFim)),
        ultrapassou: progresso.ultrapassou,
        semMedicaoDesde: progresso.semMedicaoDesde,
      });
      setProposta(null);
    } else {
      setDesafioAtivo(null);
      const recusadaEm = await lerItem<string>(
        STORAGE_KEYS.desafioReducaoPropostaRecusadaEm,
      );
      const logsSemanaAnterior = await buscarDailyLogsNoIntervalo(
        uid,
        inicioSemanaAnteriorISO,
        fimSemanaAnteriorISO,
      );
      const base = calcularBaseSegundos(logsSemanaAnterior, appsBloqueados);
      const elegivel =
        reflexaoVisivel &&
        atingeMinimoParaProposta(base) &&
        recusadaEm !== inicioSemanaAtualISO;

      if (leituraRef.current !== leitura) {
        return;
      }
      setProposta(elegivel ? montarProposta(base) : null);
    }

    setResultadoAnteriorTexto(textoResultadoAnterior(desafioAnterior));
    setCarregando(false);
  }, [uid, reflexaoVisivel]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregar = useCallback(async () => {
    try {
      await carregar();
    } catch (erro) {
      registrarErro(erro as Error, 'useDesafioReducao.recarregar');
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  const aceitar = useCallback(async () => {
    if (!proposta) {
      return;
    }
    const hoje = new Date();
    const inicioSemanaAtual = inicioDaSemana(hoje);
    const inicioSemanaAtualISO = paraISOLocal(inicioSemanaAtual);
    const dataFim = paraISOLocal(fimDaSemana(inicioSemanaAtual));
    const novo: Desafio = {
      id: `reducao_tempo_redes-${inicioSemanaAtualISO}`,
      titulo: `Até ${formatarDuracao(proposta.metaSegundos)} nas redes esta semana`,
      tipo: 'reducao_tempo_redes',
      periodo: 'semanal',
      dataInicio: inicioSemanaAtualISO,
      dataFim,
      meta: proposta.metaSegundos,
      progresso: 0,
      status: 'ativo',
      baseSegundos: proposta.baseSegundos,
    };
    await criarDesafio(uid, novo);
    logDesafioReducaoRespondido('aceitou');
    setProposta(null);
    setDesafioAtivo({
      ...novo,
      diasRestantesTexto: textoDiasRestantes(diasRestantes(hoje, dataFim)),
      ultrapassou: false,
      semMedicaoDesde: null,
    });
  }, [uid, proposta]);

  const recusar = useCallback(async () => {
    const inicioSemanaAtualISO = paraISOLocal(inicioDaSemana(new Date()));
    await salvarItem(STORAGE_KEYS.desafioReducaoPropostaRecusadaEm, inicioSemanaAtualISO);
    logDesafioReducaoRespondido('agora_nao');
    setProposta(null);
  }, []);

  return {
    proposta,
    desafioAtivo,
    resultadoAnteriorTexto,
    carregando,
    aceitar,
    recusar,
    recarregar,
  };
}
