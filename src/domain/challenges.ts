import { inicioDaSemana } from './streak';
import { dataLocalDeISO, paraISOLocal } from './data';
import {
  construirHistoricoIntervalo,
  DailyLogResumo,
  StatusHistoricoDia,
} from './progress';
import { Desafio, PeriodoDesafio, TipoDesafio } from './types';

// Segunda-feira fixa (2024-01-01 caiu numa segunda) usada como âncora pra
// numerar as semanas e alternar o desafio semanal por paridade. Hora
// LOCAL, não UTC — precisa bater com inicioDaSemana (domain/streak.ts),
// que também passou a ser local.
const EPOCA_SEMANAL = new Date(2024, 0, 1).getTime();
const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

const STATUS_CONTAM_COMO_ATIVO: ReadonlySet<StatusHistoricoDia> = new Set([
  'cumprido',
  'protegido_escudo',
]);

interface DefinicaoDesafio {
  titulo: string;
  periodo: PeriodoDesafio;
  meta: number;
}

const CATALOGO: Record<TipoDesafio, DefinicaoDesafio> = {
  exercicio_3x: {
    titulo: 'Exercite-se 3x essa semana',
    periodo: 'semanal',
    meta: 3,
  },
  essencial_todo_dia: {
    titulo: 'Cumpra sua essencial todo dia',
    periodo: 'semanal',
    meta: 7,
  },
  dias_ativos_20: {
    titulo: '20 dias ativos esse mês',
    periodo: 'mensal',
    meta: 20,
  },
};

interface Periodo {
  inicio: string;
  fim: string;
}

function numeroDaSemana(inicioSemana: Date): number {
  return Math.floor((inicioSemana.getTime() - EPOCA_SEMANAL) / MS_POR_SEMANA);
}

export function calcularPeriodoSemanal(hoje: Date): Periodo {
  const inicio = inicioDaSemana(hoje);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 6);
  return { inicio: paraISOLocal(inicio), fim: paraISOLocal(fim) };
}

export function calcularPeriodoMensal(hoje: Date): Periodo {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { inicio: paraISOLocal(inicio), fim: paraISOLocal(fim) };
}

/**
 * Qual desafio o período recebe. Semanal alterna por paridade da semana
 * (par -> exercício, ímpar -> essencial todo dia); mensal é sempre o de
 * dias ativos. Retorna sempre 1 item (array pra deixar espaço a mais de um
 * no futuro sem mudar assinatura).
 */
export function gerarCatalogoDoPeriodo(
  periodo: PeriodoDesafio,
  inicio: string,
  fim: string,
): Desafio[] {
  let tipo: TipoDesafio;
  if (periodo === 'mensal') {
    tipo = 'dias_ativos_20';
  } else {
    const par = numeroDaSemana(dataLocalDeISO(inicio)) % 2 === 0;
    tipo = par ? 'exercicio_3x' : 'essencial_todo_dia';
  }

  const def = CATALOGO[tipo];
  return [
    {
      id: `${tipo}-${inicio}`,
      titulo: def.titulo,
      tipo,
      periodo,
      dataInicio: inicio,
      dataFim: fim,
      meta: def.meta,
      progresso: 0,
      status: 'ativo',
    },
  ];
}

function contarExerciciosConcluidos(logs: DailyLogResumo[]): number {
  return logs.reduce(
    (total, log) =>
      total +
      log.tarefas.filter(
        tarefa => tarefa.tipo === 'exercicio' && tarefa.concluida,
      ).length,
    0,
  );
}

function contarDiasAtivos(
  logs: DailyLogResumo[],
  dataInicio: string,
  dataFim: string,
  hoje: Date,
): number {
  const dias = construirHistoricoIntervalo(
    logs,
    dataLocalDeISO(dataInicio),
    dataLocalDeISO(dataFim),
    hoje,
    { avaliarHojeAoVivo: true },
  );
  return dias.filter(dia => STATUS_CONTAM_COMO_ATIVO.has(dia.status)).length;
}

/**
 * Recalcula progresso e status do desafio a partir dos dailyLogs reais do
 * período — nunca de um contador incrementado à mão, pra não dessincronizar
 * se algo mudar retroativamente. Progresso é limitado à meta.
 */
export function calcularProgressoDesafio(
  desafio: Desafio,
  dailyLogsDoPeriodo: DailyLogResumo[],
  hoje: Date,
): Desafio {
  let bruto: number;
  switch (desafio.tipo) {
    case 'exercicio_3x':
      bruto = contarExerciciosConcluidos(dailyLogsDoPeriodo);
      break;
    case 'essencial_todo_dia':
    case 'dias_ativos_20':
      bruto = contarDiasAtivos(
        dailyLogsDoPeriodo,
        desafio.dataInicio,
        desafio.dataFim,
        hoje,
      );
      break;
  }

  const progresso = Math.min(bruto, desafio.meta);

  let status: Desafio['status'];
  if (progresso >= desafio.meta) {
    status = 'concluido';
  } else if (paraISOLocal(hoje) > desafio.dataFim) {
    status = 'expirado';
  } else {
    status = 'ativo';
  }

  return { ...desafio, progresso, status };
}
