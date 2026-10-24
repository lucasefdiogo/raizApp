import { inicioDaSemana } from './streak';
import { dataLocalDeISO, paraISOLocal } from './data';
import { PACOTES_REDES_SOCIAIS, nomeDoApp } from './redesSociais';
import { ResumoBloqueioDia } from './saldoBloqueio';
import { UsoApps } from './types';

export interface ContadoresBloqueio {
  sessoesUsadas: number;
  acessosRapidos: number;
  emergencias: number;
}

interface LogComUso {
  usoApps?: UsoApps;
}

interface LogComBloqueio {
  resumoBloqueio?: ResumoBloqueioDia;
}

const MES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

// Indexado por Date#getDay() (0 = domingo) — mesma ordem usada em ProgressoScreen.
const DIA_SEMANA_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const MAX_INTENCOES = 5;

/** Soma os contadores de bloqueio (RN02) — dia ou campo ausente conta como zero. */
export function somarContadoresBloqueio(logs: LogComBloqueio[]): ContadoresBloqueio {
  return logs.reduce<ContadoresBloqueio>(
    (acc, log) => ({
      sessoesUsadas: acc.sessoesUsadas + (log.resumoBloqueio?.sessoesUsadas ?? 0),
      acessosRapidos: acc.acessosRapidos + (log.resumoBloqueio?.acessosRapidos ?? 0),
      emergencias: acc.emergencias + (log.resumoBloqueio?.emergencias ?? 0),
    }),
    { sessoesUsadas: 0, acessosRapidos: 0, emergencias: 0 },
  );
}

/** Quantos dias têm `usoApps` gravado — base pra comparação (RN06) e reflexão (RN10). */
export function diasComUsoApps(logs: LogComUso[]): number {
  return logs.filter(log => log.usoApps !== undefined).length;
}

/**
 * Soma segundos das redes sociais nos dias informados — só pacotes da lista
 * curada entram na soma, o que já ignora de saída as chaves irmãs
 * `primeiroUsoDia`/`ultimoUsoAntesPausaLonga` que vivem no mesmo mapa
 * `usoApps` no Firestore (RN02, RN14).
 */
export function somarSegundosRedes(logs: LogComUso[]): number {
  return logs.reduce((total, log) => {
    if (!log.usoApps) {
      return total;
    }
    return (
      total +
      Object.entries(log.usoApps)
        .filter(([pacote]) => PACOTES_REDES_SOCIAIS.includes(pacote))
        .reduce((soma, [, uso]) => soma + uso.segundos, 0)
    );
  }, 0);
}

/** Soma aberturas das redes sociais nos dias informados (RN10, total de aberturas da reflexão). */
export function somarAberturasRedes(logs: LogComUso[]): number {
  return logs.reduce((total, log) => {
    if (!log.usoApps) {
      return total;
    }
    return (
      total +
      Object.entries(log.usoApps)
        .filter(([pacote]) => PACOTES_REDES_SOCIAIS.includes(pacote))
        .reduce((soma, [, uso]) => soma + uso.aberturas, 0)
    );
  }, 0);
}

/** Segundos por nome de app (RN08) — agrupa pacotes do mesmo app sob o mesmo nome. */
export function segundosPorNomeApp(logs: LogComUso[]): Record<string, number> {
  const porPacote: Record<string, number> = {};
  logs.forEach(log => {
    if (!log.usoApps) {
      return;
    }
    Object.entries(log.usoApps)
      .filter(([pacote]) => PACOTES_REDES_SOCIAIS.includes(pacote))
      .forEach(([pacote, uso]) => {
        porPacote[pacote] = (porPacote[pacote] ?? 0) + uso.segundos;
      });
  });

  const porNome: Record<string, number> = {};
  Object.entries(porPacote).forEach(([pacote, segundos]) => {
    const nome = nomeDoApp(pacote);
    porNome[nome] = (porNome[nome] ?? 0) + segundos;
  });
  return porNome;
}

/**
 * HU-13 (RN01, RN03): soma segundos só dos pacotes em `appsBloqueados` —
 * `regrasBloqueio.apps`, não a lista curada inteira (ver somarSegundosRedes,
 * usada pela reflexão semanal, fora do escopo desta HU).
 */
export function somarSegundosBloqueados(logs: LogComUso[], appsBloqueados: string[]): number {
  return logs.reduce((total, log) => {
    if (!log.usoApps) {
      return total;
    }
    return (
      total +
      Object.entries(log.usoApps)
        .filter(([pacote]) => appsBloqueados.includes(pacote))
        .reduce((soma, [, uso]) => soma + uso.segundos, 0)
    );
  }, 0);
}

/** HU-13 (RN01, RN03): mesma ideia de segundosPorNomeApp, filtrando por `appsBloqueados`. */
export function segundosPorNomeAppBloqueados(
  logs: LogComUso[],
  appsBloqueados: string[],
): Record<string, number> {
  const porPacote: Record<string, number> = {};
  logs.forEach(log => {
    if (!log.usoApps) {
      return;
    }
    Object.entries(log.usoApps)
      .filter(([pacote]) => appsBloqueados.includes(pacote))
      .forEach(([pacote, uso]) => {
        porPacote[pacote] = (porPacote[pacote] ?? 0) + uso.segundos;
      });
  });

  const porNome: Record<string, number> = {};
  Object.entries(porPacote).forEach(([pacote, segundos]) => {
    const nome = nomeDoApp(pacote);
    porNome[nome] = (porNome[nome] ?? 0) + segundos;
  });
  return porNome;
}

export interface AppComTempo {
  nome: string;
  segundos: number;
}

/** Apps ordenados do que mais tempo ocupou pro que menos (RN07, RN10). */
export function appsPorTempoDesc(segundosPorNome: Record<string, number>): AppComTempo[] {
  return Object.entries(segundosPorNome)
    .map(([nome, segundos]) => ({ nome, segundos }))
    .sort((a, b) => b.segundos - a.segundos);
}

/** Formata duração em horas/minutos, arredondado pra baixo (RN05). */
export function formatarDuracao(segundos: number): string {
  if (segundos <= 0) {
    return '0 min';
  }
  if (segundos < 60) {
    return 'menos de 1 min';
  }
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  if (horas === 0) {
    return `${minutos} min`;
  }
  if (minutosRestantes === 0) {
    return `${horas}h`;
  }
  return `${horas}h ${minutosRestantes}min`;
}

/** Texto de comparação com a semana anterior (RN06) — null sem base de 4 dias. */
export function textoComparacao(
  segundosAtual: number,
  segundosAnterior: number,
  diasComDadosSemanaAnterior: number,
): string | null {
  if (diasComDadosSemanaAnterior < 4) {
    return null;
  }
  const diferenca = segundosAtual - segundosAnterior;
  if (Math.abs(diferenca) < 5 * 60) {
    return 'Quase igual à semana passada';
  }
  if (diferenca < 0) {
    return `${formatarDuracao(-diferenca)} a menos que a semana passada`;
  }
  return `${formatarDuracao(diferenca)} a mais que a semana passada`;
}

export interface BarraDia {
  data: string;
  /** null = sem dado medido nesse dia (barra vazia). */
  segundos: number | null;
  hoje: boolean;
}

function barrasDaSemana(
  logsSemana: Array<{ data: string } & LogComUso>,
  inicioSemana: Date,
  hojeISO: string,
  appsBloqueados: string[],
): BarraDia[] {
  const porData = new Map(logsSemana.map(log => [log.data, log]));
  const barras: BarraDia[] = [];
  for (let i = 0; i < 7; i++) {
    const data = paraISOLocal(
      new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + i),
    );
    const log = porData.get(data);
    barras.push({
      data,
      segundos: log?.usoApps !== undefined ? somarSegundosBloqueados([log], appsBloqueados) : null,
      hoje: data === hojeISO,
    });
  }
  return barras;
}

export interface ResumoCardSemana {
  contadores: ContadoresBloqueio;
  duracaoTotal: string;
  barras: BarraDia[];
  comparacao: string | null;
  /** HU-13 RN02: "Instagram 4h 10min · TikTok 2h 30min" — null com 0 ou 1 app na soma da semana. */
  listaPorApp: string | null;
}

/**
 * Dados do ResumoRedesCard (RN01-RN06 da HU-08; RN01-RN02 da HU-13):
 * contadores sempre vêm do resumoBloqueio (independem de acesso de uso);
 * duração, barras, comparação e lista por app só existem com acesso de uso
 * concedido E pelo menos um app bloqueado — sem isso, nenhum dado de uso é
 * lido (RN04 da HU-08, RN06 da HU-13), mesmo que os logs recebidos o
 * contenham. `appsBloqueados` é sempre a lista vigente no momento em que a
 * tela é aberta (RN03 da HU-13) — quem decide o `comAcessoDeUso` combinado
 * é o hook (useResumoRedes), não esta função.
 */
export function montarResumoCard(
  logsSemanaAtual: Array<{ data: string } & LogComBloqueio & LogComUso>,
  logsSemanaAnterior: LogComUso[],
  comAcessoDeUso: boolean,
  hoje: Date,
  appsBloqueados: string[],
): ResumoCardSemana {
  const contadores = somarContadoresBloqueio(logsSemanaAtual);

  if (!comAcessoDeUso) {
    return { contadores, duracaoTotal: '', barras: [], comparacao: null, listaPorApp: null };
  }

  const inicioSemanaAtual = inicioDaSemana(hoje);
  const hojeISO = paraISOLocal(hoje);
  const segundosAtual = somarSegundosBloqueados(logsSemanaAtual, appsBloqueados);
  const segundosAnterior = somarSegundosBloqueados(logsSemanaAnterior, appsBloqueados);
  const diasAnterior = diasComUsoApps(logsSemanaAnterior);
  const appsDaSemana = appsPorTempoDesc(
    segundosPorNomeAppBloqueados(logsSemanaAtual, appsBloqueados),
  ).filter(app => app.segundos > 0);

  return {
    contadores,
    duracaoTotal: formatarDuracao(segundosAtual),
    barras: barrasDaSemana(logsSemanaAtual, inicioSemanaAtual, hojeISO, appsBloqueados),
    comparacao: textoComparacao(segundosAtual, segundosAnterior, diasAnterior),
    listaPorApp:
      appsDaSemana.length > 1
        ? appsDaSemana.map(app => `${app.nome} ${formatarDuracao(app.segundos)}`).join(' · ')
        : null,
  };
}

export interface DetalheRedesDoDia {
  duracao: string | null;
  textoContadores: string;
  topAppsTexto: string | null;
  intencoes: string[];
  intencoesExcedente: number;
}

/**
 * Dados do bloco "Nas redes" do DayDetailSheet (RN07, RN08, RN09 da HU-08;
 * RN01, RN05 da HU-13) — null quando o dia não tem nada pra mostrar.
 * `appsBloqueados` filtra duração e lista de apps pela lista vigente de
 * bloqueio (RN01/RN03 da HU-13), sem teto de quantidade (RN05 — antes
 * limitava aos 2 com mais tempo).
 */
export function detalheRedesDoDia(
  log: (LogComBloqueio & LogComUso) | null | undefined,
  comAcessoDeUso: boolean,
  appsBloqueados: string[],
): DetalheRedesDoDia | null {
  if (!log || (!log.resumoBloqueio && log.usoApps === undefined)) {
    return null;
  }

  const contadores = somarContadoresBloqueio([log]);
  const textoContadores =
    `${contadores.sessoesUsadas} sessões · ${contadores.acessosRapidos} acesso rápido` +
    (contadores.emergencias > 0 ? ` · ${contadores.emergencias} emergência` : '');

  const intencoesBrutas = (log.resumoBloqueio?.intencoes ?? []).filter(
    texto => texto.trim() !== '',
  );

  let topAppsTexto: string | null = null;
  let duracao: string | null = null;
  if (comAcessoDeUso && log.usoApps !== undefined) {
    duracao = formatarDuracao(somarSegundosBloqueados([log], appsBloqueados));
    const topApps = appsPorTempoDesc(segundosPorNomeAppBloqueados([log], appsBloqueados)).filter(
      app => app.segundos > 0,
    );
    if (topApps.length > 0) {
      topAppsTexto = topApps
        .map(app => `${app.nome} ${formatarDuracao(app.segundos)}`)
        .join(' · ');
    }
  }

  return {
    duracao,
    textoContadores,
    topAppsTexto,
    intencoes: intencoesBrutas.slice(0, MAX_INTENCOES),
    intencoesExcedente: Math.max(0, intencoesBrutas.length - MAX_INTENCOES),
  };
}

export interface ReflexaoSemanalDados {
  periodoLabel: string;
  duracaoTotal: string;
  appPrincipalTexto: string | null;
  mediaPorDia: string;
  diaMaisLongoAbreviado: string | null;
  totalAberturas: number;
}

/**
 * Dados da reflexão semanal (RN10) — null sem base de 4 dias de usoApps na
 * semana anterior. Sem comparação com a semana anterior à anterior: o hook
 * só lê os 14 dias do RN01 (semana anterior + atual), não uma terceira
 * semana — "quando houver base" (RN10) nunca teria base nesse recorte.
 */
export function reflexaoSemanal(
  logsSemanaAnterior: Array<{ data: string } & LogComUso>,
  hoje: Date,
): ReflexaoSemanalDados | null {
  const dias = diasComUsoApps(logsSemanaAnterior);
  if (dias < 4) {
    return null;
  }

  const inicioSemanaAtual = inicioDaSemana(hoje);
  const inicioAnterior = new Date(
    inicioSemanaAtual.getFullYear(),
    inicioSemanaAtual.getMonth(),
    inicioSemanaAtual.getDate() - 7,
  );
  const fimAnterior = new Date(
    inicioAnterior.getFullYear(),
    inicioAnterior.getMonth(),
    inicioAnterior.getDate() + 6,
  );
  const periodoLabel = `Semana de ${inicioAnterior.getDate()} a ${fimAnterior.getDate()} de ${
    MES_ABREV[fimAnterior.getMonth()]
  }`;

  const total = somarSegundosRedes(logsSemanaAnterior);
  const apps = appsPorTempoDesc(segundosPorNomeApp(logsSemanaAnterior));
  const principal = apps[0];
  const appPrincipalTexto =
    principal && principal.segundos > 0
      ? principal.segundos > total / 2
        ? `O ${principal.nome} ficou com mais da metade.`
        : `O ${principal.nome} foi o que mais ocupou.`
      : null;

  const diaMaisLongo = logsSemanaAnterior.reduce<{ data: string; segundos: number } | null>(
    (maior, log) => {
      const segundos = somarSegundosRedes([log]);
      return !maior || segundos > maior.segundos ? { data: log.data, segundos } : maior;
    },
    null,
  );

  return {
    periodoLabel,
    duracaoTotal: formatarDuracao(total),
    appPrincipalTexto,
    mediaPorDia: formatarDuracao(Math.round(total / 7)),
    diaMaisLongoAbreviado:
      diaMaisLongo && diaMaisLongo.segundos > 0
        ? DIA_SEMANA_ABREV[dataLocalDeISO(diaMaisLongo.data).getDay()]
        : null,
    totalAberturas: somarAberturasRedes(logsSemanaAnterior),
  };
}
