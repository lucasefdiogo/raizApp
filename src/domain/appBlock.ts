import { JanelaBloqueio, RegrasBloqueio, RegrasBloqueioPendentes } from './types';
import { dataDeAmanhaLocal } from './data';
import { extrairConfigBloco } from './saldoBloqueio';
import { PACOTES_REDES_SOCIAIS } from './redesSociais';

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
    regrasBloqueio: {
      ...extrairConfigBloco(pendentes),
      apps: pendentes.apps,
      janelas: pendentes.janelas,
    },
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

  // Config de blocos (saldoBloqueio) não tem tela ainda: a alteração de
  // apps/janelas não pode apagar o que estiver configurado nas vigentes.
  return {
    tipo: 'pendente',
    pendente: {
      ...extrairConfigBloco(regrasVigentesAtuais),
      ...novasRegras,
      efetivaEm: dataDeAmanhaLocal(hojeISO),
    },
  };
}

interface RegrasLimpas extends RegrasResolvidas {
  /** `false` quando nada saiu de nenhuma das duas regras (nada a gravar). */
  mudou: boolean;
}

/**
 * Tira de `regrasBloqueio.apps` e de `regrasBloqueioPendentes.apps` todo
 * pacote fora da lista curada de redes sociais (HU-01, RN-06). Remove direto,
 * sem criar nem adiar pendência: a pendente existente só perde os apps,
 * mantendo `efetivaEm`. Idempotente (RN-07): sobre regra já limpa devolve
 * `mudou: false`.
 */
export function limparAppsForaDaListaCurada(
  regras: RegrasBloqueio,
  pendentes: RegrasBloqueioPendentes | null,
): RegrasLimpas {
  const naLista = (pacote: string) => PACOTES_REDES_SOCIAIS.includes(pacote);
  const regrasLimpas = { ...regras, apps: regras.apps.filter(naLista) };
  const pendentesLimpas = pendentes ? { ...pendentes, apps: pendentes.apps.filter(naLista) } : null;

  const mudou =
    regrasLimpas.apps.length !== regras.apps.length ||
    (pendentes !== null && pendentesLimpas!.apps.length !== pendentes.apps.length);

  return { regrasBloqueio: regrasLimpas, regrasBloqueioPendentes: pendentesLimpas, mudou };
}
