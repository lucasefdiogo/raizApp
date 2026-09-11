import { avaliarDiaCumprido } from './streak';
import { Tarefa } from './types';

export type StatusHistoricoDia =
  | 'cumprido'
  | 'protegido_escudo'
  | 'perdido'
  | 'pendente'
  | 'sem_registro';

export interface DailyLogResumo {
  data: string;
  tarefas: Tarefa[];
  escudoUsado: boolean;
}

export interface DiaHistorico {
  data: string;
  status: StatusHistoricoDia;
}

const DIAS_HISTORICO = 7;

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function dataUTC(data: Date): Date {
  return new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()),
  );
}

function statusDoLog(log: DailyLogResumo): StatusHistoricoDia {
  if (avaliarDiaCumprido(log.tarefas)) {
    return 'cumprido';
  }
  if (log.escudoUsado) {
    return 'protegido_escudo';
  }
  return 'perdido';
}

interface OpcoesIntervalo {
  /**
   * Se true, o dia de hoje é avaliado com o dailyLog já existente (cumprido /
   * protegido / perdido) em vez de virar sempre 'pendente'. Usado pelos
   * desafios, que não dependem do recálculo do streak do dia seguinte. Um
   * hoje sem dailyLog continua 'pendente' (o dia não acabou).
   */
  avaliarHojeAoVivo?: boolean;
}

/**
 * Monta o status de cada dia entre `inicio` e `fim` (inclusivos) a partir dos
 * dailyLogs já buscados. Dias futuros e dias sem log ficam 'sem_registro'.
 * A regra de "dia cumprido" vem de avaliarDiaCumprido (domain/streak.ts) —
 * não duplicar em outro lugar.
 */
export function construirHistoricoIntervalo(
  dailyLogs: DailyLogResumo[],
  inicio: Date,
  fim: Date,
  hoje: Date,
  opcoes: OpcoesIntervalo = {},
): DiaHistorico[] {
  const hojeISO = paraISO(hoje);
  const porData = new Map(dailyLogs.map(log => [log.data, log]));

  const dias: DiaHistorico[] = [];
  const cursor = dataUTC(inicio);
  const ultimo = dataUTC(fim);

  while (cursor.getTime() <= ultimo.getTime()) {
    const dataISO = paraISO(cursor);
    const log = porData.get(dataISO);

    if (dataISO > hojeISO) {
      dias.push({ data: dataISO, status: 'sem_registro' });
    } else if (dataISO === hojeISO) {
      if (opcoes.avaliarHojeAoVivo && log) {
        dias.push({ data: dataISO, status: statusDoLog(log) });
      } else {
        dias.push({ data: dataISO, status: 'pendente' });
      }
    } else if (!log) {
      dias.push({ data: dataISO, status: 'sem_registro' });
    } else {
      dias.push({ data: dataISO, status: statusDoLog(log) });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dias;
}

/**
 * Últimos 7 dias (mais antigo -> mais recente). O dia de hoje é sempre
 * 'pendente' — o dia corrente só vira 'cumprido' quando useStreak recalcular,
 * no dia seguinte.
 */
export function construirHistoricoSemana(
  dailyLogs: DailyLogResumo[],
  hoje: Date,
): DiaHistorico[] {
  const inicio = dataUTC(hoje);
  inicio.setUTCDate(inicio.getUTCDate() - (DIAS_HISTORICO - 1));
  return construirHistoricoIntervalo(dailyLogs, inicio, hoje, hoje);
}
