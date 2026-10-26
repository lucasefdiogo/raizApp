import { somarSegundosBloqueados, diasComUsoApps, formatarDuracao } from './resumoRedes';
import { UsoApps } from './types';

interface LogComUso {
  usoApps?: UsoApps;
}

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
