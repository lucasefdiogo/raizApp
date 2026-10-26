import { somarSegundosBloqueados, diasComUsoApps, formatarDuracao } from './resumoRedes';
import { paraISOLocal, dataLocalDeISO } from './data';
import { Desafio, StatusDesafio, UsoApps } from './types';

interface LogComUso {
  usoApps?: UsoApps;
}

interface LogDoDia extends LogComUso {
  data: string;
}

// Indexado por Date#getDay() (0 = domingo).
const DIA_SEMANA_COMPLETO = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

export interface PropostaDesafioReducao {
  titulo: string;
  linha: string;
  metaSegundos: number;
  baseSegundos: number;
}

/**
 * RN: 7 dias de dado -> a base é o total da semana; 4-6 dias -> média dos
 * dias com dado × 7. Dia sem usoApps não conta como zero (diasComUsoApps já
 * ignora esses dias no denominador).
 */
export function calcularBaseSegundos(
  logsSemanaAnterior: LogComUso[],
  appsBloqueados: string[],
): number {
  const total = somarSegundosBloqueados(logsSemanaAnterior, appsBloqueados);
  const dias = diasComUsoApps(logsSemanaAnterior);
  if (dias === 0) {
    return 0;
  }
  if (dias >= 7) {
    return total;
  }
  return Math.round((total / dias) * 7);
}

export function atingeMinimoParaProposta(baseSegundos: number): boolean {
  return baseSegundos >= 3600;
}

/**
 * Meta = base × 0,9, arredondada pra baixo ao múltiplo de 5min (300s).
 * `Math.round` antes do `/300` absorve o erro de ponto flutuante do `* 0.9`
 * (ex.: 20000 * 0.9 deveria ser 18000 exato, mas pode chegar como
 * 17999.999999998 — sem o round, o floor seguinte cairia pro múltiplo errado).
 */
export function calcularMetaSegundos(baseSegundos: number): number {
  return Math.floor(Math.round(baseSegundos * 0.9) / 300) * 300;
}

export function montarProposta(baseSegundos: number): PropostaDesafioReducao {
  const metaSegundos = calcularMetaSegundos(baseSegundos);
  const delta = baseSegundos - metaSegundos;
  return {
    titulo: `Até ${formatarDuracao(metaSegundos)} nas redes`,
    linha: `Cerca de ${formatarDuracao(delta)} a menos que a semana passada. Pequeno de propósito.`,
    metaSegundos,
    baseSegundos,
  };
}

export interface ProgressoReducao {
  progressoSegundos: number;
  ultrapassou: boolean;
  semMedicaoDesde: string | null;
}

/**
 * RN: progresso sempre recalculado de dailyLogs.usoApps, nunca incrementado.
 * Sem acesso de uso (comAcessoDeUso false), o progresso congela no último
 * valor gravado (`desafio.progresso`) e aponta o último dia da semana com
 * medição — nunca volta a somar os logs enquanto o acesso estiver revogado.
 */
export function calcularProgressoReducao(
  desafio: Desafio,
  logsSemana: LogDoDia[],
  appsBloqueados: string[],
  comAcessoDeUso: boolean,
): ProgressoReducao {
  if (!comAcessoDeUso) {
    const ultimoComDado = logsSemana
      .filter(log => log.usoApps !== undefined)
      .sort((a, b) => (a.data < b.data ? 1 : -1))[0];
    return {
      progressoSegundos: desafio.progresso,
      ultrapassou: desafio.progresso > desafio.meta,
      semMedicaoDesde: ultimoComDado
        ? DIA_SEMANA_COMPLETO[dataLocalDeISO(ultimoComDado.data).getDay()]
        : null,
    };
  }

  const progressoSegundos = somarSegundosBloqueados(logsSemana, appsBloqueados);
  return {
    progressoSegundos,
    ultrapassou: progressoSegundos > desafio.meta,
    semMedicaoDesde: null,
  };
}

export function statusAoFechar(progressoSegundos: number, metaSegundos: number): StatusDesafio {
  return progressoSegundos <= metaSegundos ? 'concluido' : 'expirado';
}

/** Dias de calendário entre hoje e dataFim (a semana sempre termina num domingo). */
export function diasRestantes(hoje: Date, dataFim: string): number {
  const hojeData = dataLocalDeISO(paraISOLocal(hoje));
  const fimData = dataLocalDeISO(dataFim);
  const diffMs = fimData.getTime() - hojeData.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function textoDiasRestantes(dias: number): string {
  if (dias === 0) {
    return 'Último dia';
  }
  if (dias === 1) {
    return '1 dia restante';
  }
  return `${dias} dias restantes`;
}

/** RN: só o concluído gera texto — expirado (ou nenhum desafio anterior) fica em silêncio. */
export function textoResultadoAnterior(desafioAnterior: Desafio | null): string | null {
  return desafioAnterior?.status === 'concluido'
    ? 'Você fechou a semana passada dentro do combinado.'
    : null;
}
