import { paraISOLocal } from './data';
import { PACOTES_REDES_SOCIAIS } from './redesSociais';
import { UsoApps } from './types';

/**
 * Evento do UsageStatsManager (HU-02, RN-01). `ts` é epoch ms; primeiro_plano
 * corresponde a ACTIVITY_RESUMED e segundo_plano a ACTIVITY_PAUSED.
 */
export interface EventoUso {
  pacote: string;
  classe: string;
  tipo: 'primeiro_plano' | 'segundo_plano';
  ts: number;
}

interface Sessao {
  pacote: string;
  ativas: Set<string>;
  // Início do trecho em primeiro plano; null enquanto o app está pausado.
  trechoInicio: number | null;
}

/**
 * Agrega eventos em { segundos, aberturas } por dia local e pacote da lista
 * curada (RN-02, RN-03). Pura e determinística: a mesma entrada dá sempre a
 * mesma saída, então recalcular a janela inteira é seguro (RN-04).
 *
 * Todo pacote entra na máquina de estados, mesmo fora da lista: ir do
 * Instagram ao Chrome e voltar precisa contar duas aberturas. Trocar de
 * tela dentro do mesmo app (pausa de uma Activity seguida de retomada de
 * outra do mesmo pacote, sem outro app no meio) continua a mesma abertura.
 */
export function agregarUsoPorDia(
  eventos: EventoUso[],
  inicioMs: number,
  fimMs: number,
): Record<string, UsoApps> {
  // Milissegundos por dia/pacote; vira segundos inteiros só no fim para não
  // perder fração a cada trecho.
  const msPorDia: Record<string, Record<string, { ms: number; aberturas: number }>> = {};

  const registro = (dia: string, pacote: string) => {
    msPorDia[dia] ??= {};
    msPorDia[dia][pacote] ??= { ms: 0, aberturas: 0 };
    return msPorDia[dia][pacote];
  };

  const somarTrecho = (pacote: string, de: number, ate: number) => {
    if (!PACOTES_REDES_SOCIAIS.includes(pacote) || ate <= de) {
      return;
    }
    let cursor = de;
    while (cursor < ate) {
      const d = new Date(cursor);
      // Meia-noite local seguinte via construtor: somar 86400000 erra em
      // dia de mudança de horário de verão.
      const proximaMeiaNoite = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const fimParte = Math.min(ate, proximaMeiaNoite);
      registro(paraISOLocal(d), pacote).ms += fimParte - cursor;
      cursor = fimParte;
    }
  };

  const ordenados = eventos
    .filter((e) => e.ts >= inicioMs && e.ts <= fimMs)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (a.e.ts !== b.e.ts) {
        return a.e.ts - b.e.ts;
      }
      // Empate: a saída vem antes da entrada, como na transição real de apps.
      if (a.e.tipo !== b.e.tipo) {
        return a.e.tipo === 'segundo_plano' ? -1 : 1;
      }
      return a.i - b.i;
    })
    .map(({ e }) => e);

  let atual: Sessao | null = null;

  const fecharTrecho = (ate: number) => {
    if (atual && atual.trechoInicio !== null) {
      somarTrecho(atual.pacote, atual.trechoInicio, ate);
      atual.trechoInicio = null;
    }
  };

  for (const evento of ordenados) {
    if (evento.tipo === 'primeiro_plano') {
      if (atual && atual.pacote === evento.pacote) {
        atual.ativas.add(evento.classe);
        atual.trechoInicio ??= evento.ts;
      } else {
        fecharTrecho(evento.ts);
        atual = { pacote: evento.pacote, ativas: new Set([evento.classe]), trechoInicio: evento.ts };
        if (PACOTES_REDES_SOCIAIS.includes(evento.pacote)) {
          registro(paraISOLocal(new Date(evento.ts)), evento.pacote).aberturas += 1;
        }
      }
    } else if (atual && atual.pacote === evento.pacote) {
      atual.ativas.delete(evento.classe);
      if (atual.ativas.size === 0) {
        fecharTrecho(evento.ts);
      }
    }
  }
  // Entrada sem saída: o trecho aberto termina no fim da janela.
  fecharTrecho(fimMs);

  const resultado: Record<string, UsoApps> = {};
  for (const [dia, pacotes] of Object.entries(msPorDia)) {
    resultado[dia] = {};
    for (const [pacote, { ms, aberturas }] of Object.entries(pacotes)) {
      resultado[dia][pacote] = { segundos: Math.floor(ms / 1000), aberturas };
    }
  }
  return resultado;
}
