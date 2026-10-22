import { Rotina } from './types';

/** Dia com os horários de uso coletados (HU-06, RN-01); ambos opcionais. */
export interface DiaRotina {
  primeiroUsoDia?: string;
  ultimoUsoAntesPausaLonga?: string;
}

/** Mínimo de dias com os dois campos para estimar (RN-03). */
export const MIN_DIAS_ESTIMATIVA = 5;

const MIN_POR_DIA = 24 * 60;
const MEIO_DIA = 12 * 60;

// Minutos desde a meia-noite a partir de ISO local sem fuso. Lê o trecho
// HH:mm direto da string para não passar por Date (e por fuso).
function minutosDoDia(iso: string): number {
  const [h, m] = iso.split('T')[1].split(':');
  return Number(h) * 60 + Number(m);
}

function mediana(valores: number[]): number {
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  return ord.length % 2 === 1
    ? ord[meio]
    : Math.round((ord[meio - 1] + ord[meio]) / 2);
}

function formatar(minutos: number): string {
  const m = ((minutos % MIN_POR_DIA) + MIN_POR_DIA) % MIN_POR_DIA;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Antecedência da janela noturna em relação a dormirEstimado (RN-07). */
const ANTECEDENCIA_JANELA_MIN = 30;

function minutosDeHora(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Janela noturna (RN-05, RN-07, RN-11): de 30 min antes de dormirEstimado até
 * acordarEstimado, em horário local de `agora`. Início inclusivo, fim
 * exclusivo. Sem rotina ou sem confirmadoEm, nunca se aplica. Quando o início
 * cai no dia anterior ou o fim é menor que o início, a janela cruza a
 * meia-noite.
 */
export function dentroDaJanelaNoturna(
  rotina: Rotina | null | undefined,
  agora: Date,
): boolean {
  if (!rotina || !rotina.confirmadoEm) {
    return false;
  }
  const inicio =
    (minutosDeHora(rotina.dormirEstimado) -
      ANTECEDENCIA_JANELA_MIN +
      MIN_POR_DIA) %
    MIN_POR_DIA;
  const fim = minutosDeHora(rotina.acordarEstimado);
  const atual = agora.getHours() * 60 + agora.getMinutes();
  return inicio <= fim
    ? atual >= inicio && atual < fim
    : atual >= inicio || atual < fim;
}

/**
 * Estima dormir e acordar pela mediana dos horários (RN-03). Só dias com os
 * dois campos contam; com menos de 5, ou com modoManual verdadeiro (RN-12),
 * devolve null. Dormir antes das 12h é pós-meia-noite e entra como 24h+
 * para a mediana não quebrar na virada; o resultado volta ao intervalo 0-24h.
 */
export function estimarRotina(
  dias: DiaRotina[],
  modoManual: boolean,
): Pick<Rotina, 'dormirEstimado' | 'acordarEstimado'> | null {
  if (modoManual) {
    return null;
  }
  const validos = dias.filter(
    (d) => d.primeiroUsoDia && d.ultimoUsoAntesPausaLonga,
  );
  if (validos.length < MIN_DIAS_ESTIMATIVA) {
    return null;
  }
  const acordar = validos.map((d) => minutosDoDia(d.primeiroUsoDia as string));
  const dormir = validos.map((d) => {
    const min = minutosDoDia(d.ultimoUsoAntesPausaLonga as string);
    return min < MEIO_DIA ? min + MIN_POR_DIA : min;
  });
  return {
    dormirEstimado: formatar(mediana(dormir)),
    acordarEstimado: formatar(mediana(acordar)),
  };
}
