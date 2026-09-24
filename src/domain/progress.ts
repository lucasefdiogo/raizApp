import { avaliarDiaCumprido } from './streak';
import { paraISOLocal } from './data';
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

/** Meia-noite LOCAL de `data`, sem componente de hora — base segura pra
 * iterar dia a dia (getDate/setDate, nunca getUTCDate/setUTCDate). */
function inicioDoDiaLocal(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
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
   * Se true, o dia de hoje pode virar 'cumprido' ao vivo assim que o
   * dailyLog já existente mostra a essencial concluída (ou 60% das
   * tarefas) — mas NUNCA 'perdido' ou 'protegido_escudo' antes da virada:
   * um dia sem a essencial concluída às 10h da manhã ainda pode ser
   * cumprido às 22h, e só useStreak.processar() (no boot do dia seguinte,
   * avaliando o dia anterior) pode julgar um dia como perdido. Sem
   * cumprimento ainda, ou sem dailyLog, hoje continua 'pendente'.
   */
  avaliarHojeAoVivo?: boolean;
}

/**
 * Status de UM dia (mesma regra usada por construirHistoricoIntervalo, aqui
 * extraída pra ser reaproveitada por quem só tem um dailyLog na mão — ver
 * useDayDetail, que recalcula o status ao abrir o detalhe de um dia
 * específico sem duplicar essa lógica).
 */
export function avaliarStatusHistoricoDia(
  log: DailyLogResumo | null,
  dataISO: string,
  hoje: Date,
  opcoes: OpcoesIntervalo = {},
): StatusHistoricoDia {
  const hojeISO = paraISOLocal(hoje);

  if (dataISO > hojeISO) {
    return 'sem_registro';
  }
  if (dataISO === hojeISO) {
    if (opcoes.avaliarHojeAoVivo && log && avaliarDiaCumprido(log.tarefas)) {
      return 'cumprido';
    }
    return 'pendente';
  }
  if (!log) {
    return 'sem_registro';
  }
  return statusDoLog(log);
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
  const porData = new Map(dailyLogs.map(log => [log.data, log]));

  const dias: DiaHistorico[] = [];
  const cursor = inicioDoDiaLocal(inicio);
  const ultimo = inicioDoDiaLocal(fim);

  while (cursor.getTime() <= ultimo.getTime()) {
    const dataISO = paraISOLocal(cursor);
    const log = porData.get(dataISO) ?? null;
    dias.push({
      data: dataISO,
      status: avaliarStatusHistoricoDia(log, dataISO, hoje, opcoes),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

/**
 * Últimos 7 dias (mais antigo -> mais recente). O dia de hoje reflete o
 * dailyLog ao vivo: vira 'cumprido' assim que a essencial (ou 60% das
 * tarefas) é concluída, mas nunca 'perdido' antes da virada — sem
 * cumprimento ainda, continua 'pendente' até o boot do dia seguinte julgar
 * o dia (ver avaliarStatusHistoricoDia / useStreak.processar()).
 */
export function construirHistoricoSemana(
  dailyLogs: DailyLogResumo[],
  hoje: Date,
): DiaHistorico[] {
  const inicio = inicioDoDiaLocal(hoje);
  inicio.setDate(inicio.getDate() - (DIAS_HISTORICO - 1));
  return construirHistoricoIntervalo(dailyLogs, inicio, hoje, hoje, {
    avaliarHojeAoVivo: true,
  });
}
