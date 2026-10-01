import { RegrasBloqueio, RegrasBloqueioPendentes } from './types';

export function paraMinutosDoDia(horario: string): number | null {
  const partes = horario.split(':');
  if (partes.length !== 2) {
    return null;
  }
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) {
    return null;
  }
  return horas * 60 + minutos;
}

interface RegrasResolvidas {
  regrasBloqueio: RegrasBloqueio;
  regrasBloqueioPendentes: RegrasBloqueioPendentes | null;
}

/**
 * Regra de pré-compromisso (seção 6 da spec 09-ponte-fuga-tarefa): uma
 * alteração que AFROUXA as regras vigentes só é promovida de
 * `regrasBloqueioPendentes` pra `regrasBloqueio` na primeira abertura a
 * partir de `efetivaEm` (inclusive) — nunca antes, mesmo que o app seja
 * reaberto várias vezes no mesmo dia anterior a essa data. Comparação de
 * data como string funciona por ambas seguirem sempre YYYY-MM-DD.
 *
 * Chamar em toda abertura do app (não só a primeira "de fato") é seguro e
 * idempotente: sem pendente, é no-op; com pendente ainda não vencida,
 * devolve tudo como veio.
 */
export function aplicarRegrasBloqueioPendentesSeVencidas(
  regrasAtuais: RegrasBloqueio,
  pendentes: RegrasBloqueioPendentes | null,
  hojeISO: string,
): RegrasResolvidas {
  if (!pendentes) {
    return { regrasBloqueio: regrasAtuais, regrasBloqueioPendentes: null };
  }

  if (hojeISO < pendentes.efetivaEm) {
    return { regrasBloqueio: regrasAtuais, regrasBloqueioPendentes: pendentes };
  }

  return {
    regrasBloqueio: { apps: pendentes.apps, janelas: pendentes.janelas },
    regrasBloqueioPendentes: null,
  };
}
