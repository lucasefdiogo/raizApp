import { useCallback, useEffect, useRef, useState } from 'react';
import {
  atualizarProgressoDesafio,
  buscarDailyLogsNoIntervalo,
  buscarDesafiosAtivos,
  criarDesafio,
} from '../services/firestore';
import {
  calcularPeriodoMensal,
  calcularPeriodoSemanal,
  calcularProgressoDesafio,
  gerarCatalogoDoPeriodo,
} from '../domain/challenges';
import { DailyLogResumo } from '../domain/progress';
import { DailyLog, Desafio, PeriodoDesafio } from '../domain/types';
import { useToast } from './useToast';

const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';

interface UseDesafiosResultado {
  desafioSemanal: Desafio | null;
  desafioMensal: Desafio | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

interface Periodo {
  inicio: string;
  fim: string;
}

function paraResumo(log: DailyLog): DailyLogResumo {
  return {
    data: log.data,
    tarefas: log.tarefas,
    escudoUsado: log.escudoUsado,
  };
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Mantém 1 desafio semanal + 1 mensal do período corrente. No mount (e no
 * recarregar): fecha desafios ativos de períodos já encerrados, gera os do
 * período atual se ainda não existem, e recalcula progresso a partir dos
 * dailyLogs reais — persistindo só quando muda. Não incrementa contador à
 * mão.
 */
export function useDesafios(uid: string): UseDesafiosResultado {
  const { showToast } = useToast();
  const [desafioSemanal, setDesafioSemanal] = useState<Desafio | null>(null);
  const [desafioMensal, setDesafioMensal] = useState<Desafio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const leituraRef = useRef(0);

  const resolverDesafio = useCallback(
    async (
      periodo: PeriodoDesafio,
      datas: Periodo,
      ativos: Desafio[],
      hoje: Date,
    ): Promise<Desafio> => {
      const existente = ativos.find(
        desafio =>
          desafio.periodo === periodo &&
          desafio.dataInicio === datas.inicio,
      );

      let base: Desafio;
      if (existente) {
        base = existente;
      } else {
        base = gerarCatalogoDoPeriodo(periodo, datas.inicio, datas.fim)[0];
        await criarDesafio(uid, base);
      }

      const logs = await buscarDailyLogsNoIntervalo(
        uid,
        base.dataInicio,
        base.dataFim,
      );
      const atualizado = calcularProgressoDesafio(
        base,
        logs.map(paraResumo),
        hoje,
      );

      if (
        atualizado.progresso !== base.progresso ||
        atualizado.status !== base.status
      ) {
        await atualizarProgressoDesafio(
          uid,
          atualizado.id,
          atualizado.progresso,
          atualizado.status,
        );
      }

      return atualizado;
    },
    [uid],
  );

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;
    const hoje = new Date();
    const limite = hojeISO();

    const ativos = await buscarDesafiosAtivos(uid);

    // Desafios ativos de períodos já encerrados: recalcula uma última vez e
    // fecha (concluido / expirado) pra sair da tela.
    for (const antigo of ativos) {
      if (antigo.dataFim >= limite) {
        continue;
      }
      const logs = await buscarDailyLogsNoIntervalo(
        uid,
        antigo.dataInicio,
        antigo.dataFim,
      );
      const fechado = calcularProgressoDesafio(antigo, logs.map(paraResumo), hoje);
      await atualizarProgressoDesafio(
        uid,
        fechado.id,
        fechado.progresso,
        fechado.status,
      );
    }

    const semanal = await resolverDesafio(
      'semanal',
      calcularPeriodoSemanal(hoje),
      ativos,
      hoje,
    );
    const mensal = await resolverDesafio(
      'mensal',
      calcularPeriodoMensal(hoje),
      ativos,
      hoje,
    );

    if (leituraRef.current !== leitura) {
      return;
    }
    setDesafioSemanal(semanal);
    setDesafioMensal(mensal);
    setCarregando(false);
  }, [uid, resolverDesafio]);

  useEffect(() => {
    carregar().catch(() => setCarregando(false));
  }, [carregar]);

  const recarregar = useCallback(async () => {
    try {
      await carregar();
    } catch {
      setCarregando(false);
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  return { desafioSemanal, desafioMensal, carregando, recarregar };
}
