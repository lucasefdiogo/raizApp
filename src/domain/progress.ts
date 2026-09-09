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

/**
 * Monta os últimos 7 dias (mais antigo -> mais recente) a partir dos
 * dailyLogs já buscados do Firestore. O dia de hoje é sempre 'pendente',
 * mesmo que já tenha um dailyLog com tarefa essencial concluída — o dia
 * corrente só vira 'cumprido' quando useStreak recalcular, no dia seguinte.
 * Reaproveita avaliarDiaCumprido (domain/streak.ts) para não duplicar a
 * regra de "dia cumprido" em dois lugares.
 */
export function construirHistoricoSemana(
  dailyLogs: DailyLogResumo[],
  hoje: Date,
): DiaHistorico[] {
  const hojeISO = paraISO(hoje);
  const porData = new Map(dailyLogs.map(log => [log.data, log]));

  const dias: DiaHistorico[] = [];
  for (let i = DIAS_HISTORICO - 1; i >= 0; i--) {
    const data = new Date(hoje);
    data.setUTCDate(data.getUTCDate() - i);
    const dataISO = paraISO(data);

    if (dataISO === hojeISO) {
      dias.push({ data: dataISO, status: 'pendente' });
      continue;
    }

    const log = porData.get(dataISO);
    if (!log) {
      dias.push({ data: dataISO, status: 'sem_registro' });
      continue;
    }

    if (avaliarDiaCumprido(log.tarefas)) {
      dias.push({ data: dataISO, status: 'cumprido' });
    } else if (log.escudoUsado) {
      dias.push({ data: dataISO, status: 'protegido_escudo' });
    } else {
      dias.push({ data: dataISO, status: 'perdido' });
    }
  }

  return dias;
}
