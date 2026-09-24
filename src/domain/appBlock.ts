import { RegrasBloqueio, RegrasBloqueioPendentes } from './types';

/**
 * Adiciona ou remove `packageName` da seleção — a única regra de negócio
 * real desta feature (o resto é CRUD de configuração). Pura, sem
 * React/Firebase, pra ser fácil de testar isolada.
 */
export function alternarAppNaSelecao(
  selecionados: string[],
  packageName: string,
): string[] {
  return selecionados.includes(packageName)
    ? selecionados.filter(pacote => pacote !== packageName)
    : [...selecionados, packageName];
}

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

/**
 * Mesma lógica de janela de horário do lado nativo (BloqueioPrefs.kt,
 * dentroDoHorario) — replicada aqui em JS só pra exibição na Home (o
 * "ativoAgora" é indicativo, não precisa estar sincronizado ao segundo
 * com o que o AccessibilityService de fato aplica). Trata o caso da janela
 * atravessar a meia-noite (ex: 22:00-06:00).
 */
export function estaDentroDaJanelaDeHorario(
  horarioInicio: string | null,
  horarioFim: string | null,
  agora: Date = new Date(),
): boolean {
  if (!horarioInicio || !horarioFim) {
    return false;
  }

  const minutosInicio = paraMinutosDoDia(horarioInicio);
  const minutosFim = paraMinutosDoDia(horarioFim);
  if (minutosInicio === null || minutosFim === null) {
    return false;
  }

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  return minutosInicio <= minutosFim
    ? minutosAgora >= minutosInicio && minutosAgora <= minutosFim
    : minutosAgora >= minutosInicio || minutosAgora <= minutosFim;
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
