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

/** HU-12: horários que representam "o dia todo" — mesmo formato de `JanelaBloqueio`, sem campo novo. */
export const HORARIOS_DIA_TODO = { inicio: '00:00', fim: '23:59' } as const;

/** HU-12: janela sem horário fixo — início/fim cobrem o dia inteiro. */
export function ehJanelaDiaTodo(janela: JanelaBloqueio): boolean {
  return janela.inicio === HORARIOS_DIA_TODO.inicio && janela.fim === HORARIOS_DIA_TODO.fim;
}

function resumoJanela(janela: JanelaBloqueio): string {
  const dias = formatarDiasSemana(janela.diasSemana);
  if (ehJanelaDiaTodo(janela)) {
    return `${dias}, o dia todo`;
  }
  return `${dias} das ${janela.inicio} às ${janela.fim}`;
}

/** Dias abreviados pro resumo curto (RN10): intervalo contínuo vira "seg a sex". */
function formatarDiasResumoCurto(diasSemana: number[]): string {
  if (diasSemana.length === 7) {
    return 'todos os dias';
  }
  const ordenados = [...diasSemana].sort((a, b) => a - b);
  if (ordenados.length === 1) {
    return NOMES_DIAS_SEMANA[ordenados[0]];
  }
  const continuo = ordenados.every(
    (dia, indice) => indice === 0 || dia === ordenados[indice - 1] + 1,
  );
  if (continuo) {
    return `${NOMES_DIAS_SEMANA[ordenados[0]]} a ${NOMES_DIAS_SEMANA[ordenados[ordenados.length - 1]]}`;
  }
  return ordenados.map(dia => NOMES_DIAS_SEMANA[dia]).join(', ');
}

/** Texto curto pro banner de pendência e pro aviso de alteração (RN10). */
export function resumoCurtoBloqueio(regras: RegrasBloqueio): string {
  if (regras.apps.length === 0) {
    return 'Nenhum app bloqueado.';
  }

  const quantidade = regras.apps.length;
  const textoApps = quantidade === 1 ? '1 app' : `${quantidade} apps`;
  const janela = regras.janelas[0];

  if (!janela) {
    return textoApps;
  }

  const textoJanela = ehJanelaDiaTodo(janela) ? 'o dia todo' : `${janela.inicio}–${janela.fim}`;
  return `${textoApps} · ${formatarDiasResumoCurto(janela.diasSemana)} · ${textoJanela}`;
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

function mesmosItens<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every(item => b.includes(item));
}

/**
 * Compara só o que a tela de Bloqueio de apps edita (apps marcados e
 * janelas), sem depender de ordem — config de blocos e `efetivaEm` ficam de
 * fora. Usado pra saber se há alteração não salva ao sair da tela.
 */
export function mesmasRegrasBloqueio(a: RegrasBloqueio, b: RegrasBloqueio): boolean {
  return (
    mesmosItens(a.apps, b.apps) &&
    a.janelas.length === b.janelas.length &&
    a.janelas.every((janela, indice) => {
      const outra = b.janelas[indice];
      return (
        janela.inicio === outra.inicio &&
        janela.fim === outra.fim &&
        mesmosItens(janela.diasSemana, outra.diasSemana)
      );
    })
  );
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
