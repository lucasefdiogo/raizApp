import { paraISOLocal } from './data';

export interface EventoAcessibilidade {
  tipo: 'desligamento' | 'religamento';
  /** ISO 8601 instant of the event. */
  em: string;
}

export interface AcessibilidadeDoDia {
  desligadoEm: string[];
  religadoEm: string[];
}

/**
 * Groups service events by the LOCAL day of each event (RN-07), not UTC.
 * Both arrays are always present on a day that appears in the result (empty
 * when that kind has no event); days without events do not appear. The same
 * instant is never repeated within an array. Invalid timestamps are skipped.
 */
export function agruparEventosPorDia(
  eventos: EventoAcessibilidade[],
): Record<string, AcessibilidadeDoDia> {
  const porDia: Record<string, AcessibilidadeDoDia> = {};
  for (const evento of eventos) {
    const data = new Date(evento.em);
    if (Number.isNaN(data.getTime())) {
      continue;
    }
    const dia = paraISOLocal(data);
    const entrada = (porDia[dia] ??= { desligadoEm: [], religadoEm: [] });
    const lista =
      evento.tipo === 'desligamento' ? entrada.desligadoEm : entrada.religadoEm;
    if (!lista.includes(evento.em)) {
      lista.push(evento.em);
    }
  }
  return porDia;
}
