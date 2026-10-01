import { JanelaBloqueio, RegrasBloqueio, RegrasBloqueioPendentes } from './types';
import { dataDeAmanhaLocal } from './data';

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
 * Regra de pré-compromisso (seção 6 da spec 09-ponte-fuga-tarefa, regra
 * única): QUALQUER alteração feita depois da primeira configuração só é
 * promovida de `regrasBloqueioPendentes` pra `regrasBloqueio` na primeira
 * abertura a partir de `efetivaEm` (inclusive) — nunca antes, mesmo que o
 * app seja reaberto várias vezes no mesmo dia anterior a essa data, e sem
 * distinguir se a mudança afrouxa ou endurece o bloqueio. Comparação de
 * data como string funciona por ambas seguirem sempre YYYY-MM-DD.
 *
 * Chamar em toda abertura do app (não só a primeira "de fato") é seguro e
 * idempotente: sem pendente, é no-op; com pendente ainda não vencida,
 * devolve tudo como veio. Reimplementada em Kotlin (BloqueioPrefs, mesma
 * regra) porque o AccessibilityService roda sem JS — as duas cópias operam
 * sobre o mesmo dado e devem sempre concordar.
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

/** `fim` precisa ser estritamente depois de `início` — esta versão não cobre janela que atravessa a meia-noite. */
export function janelaBloqueioValida(inicio: string, fim: string): boolean {
  const minutosInicio = paraMinutosDoDia(inicio);
  const minutosFim = paraMinutosDoDia(fim);
  if (minutosInicio === null || minutosFim === null) {
    return false;
  }
  return minutosFim > minutosInicio;
}

const NOMES_DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** 0 = domingo, segue Date.getDay(). */
export function formatarDiasSemana(diasSemana: number[]): string {
  if (diasSemana.length === 7) {
    return 'todos os dias';
  }
  if (diasSemana.length === 0) {
    return 'nenhum dia';
  }
  return [...diasSemana]
    .sort((a, b) => a - b)
    .map(dia => NOMES_DIAS_SEMANA[dia])
    .join(', ');
}

function resumoJanela(janela: JanelaBloqueio): string {
  return `${formatarDiasSemana(janela.diasSemana)} das ${janela.inicio} às ${janela.fim}`;
}

/** Texto curto pra tela de configuração e pro aviso de alteração pendente. */
export function resumoRegrasBloqueio(regras: RegrasBloqueio): string {
  if (regras.apps.length === 0) {
    return 'Nenhum app bloqueado.';
  }

  const quantidade = regras.apps.length;
  const textoApps = quantidade === 1 ? '1 app selecionado' : `${quantidade} apps selecionados`;
  const janela = regras.janelas[0];

  if (!janela) {
    return `${textoApps}, sem janela de horário definida.`;
  }

  return `${textoApps}, ${resumoJanela(janela)}.`;
}

export type DecisaoRegrasBloqueio =
  | { tipo: 'imediata'; regras: RegrasBloqueio }
  | { tipo: 'pendente'; pendente: RegrasBloqueioPendentes };

/**
 * Decide onde gravar uma alteração às regras de bloqueio (seção 6 da spec,
 * regra única): sem `regrasBloqueio` ainda configurado, é a primeira
 * configuração e vale na hora; a partir daí, QUALQUER alteração — inclusive
 * desativar o bloqueio — vira pendente, efetiva amanhã. Não distingue tipo
 * de mudança.
 */
export function decidirGravacaoRegrasBloqueio(
  regrasVigentesAtuais: RegrasBloqueio | null | undefined,
  novasRegras: RegrasBloqueio,
  hojeISO: string,
): DecisaoRegrasBloqueio {
  if (!regrasVigentesAtuais) {
    return { tipo: 'imediata', regras: novasRegras };
  }

  return {
    tipo: 'pendente',
    pendente: { ...novasRegras, efetivaEm: dataDeAmanhaLocal(hojeISO) },
  };
}
