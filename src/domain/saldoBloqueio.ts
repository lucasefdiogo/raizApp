// Saldo diário de blocos de uso dos apps bloqueados (substitui o loop de
// "Liberar 15 minutos" renovável). Máquina de estados PURA: recebe estado,
// config e `agora` (epoch ms) e devolve o próximo estado — sem relógio, sem
// React, sem Firebase.
//
// ATENÇÃO: esta é a cópia de referência (testada com Jest) da regra que
// vive de fato em Kotlin (SaldoBloqueioMaquina.kt), porque o
// AccessibilityService roda sem JS — mesmo precedente de
// aplicarRegrasBloqueioPendentesSeVencidas. As duas cópias são validadas
// pelas MESMAS fixtures (domain/__fixtures__/saldoBloqueio.json, lidas pelo
// Jest e pelo JUnit): mexeu aqui, mexa lá e nas fixtures.

import { Tarefa } from './types';

/**
 * PAUSA_INTENCAO não aparece aqui de propósito: é um estado só de tela
 * (ver FaseTela) — se o usuário sai, ela reinicia, então não há nada pra
 * persistir. O estado persistido fica em AGUARDANDO_LIBERACAO até o
 * "Liberar" valer.
 */
export type FaseBloqueio =
  | 'BLOQUEADO_SEM_ESSENCIAL'
  | 'AGUARDANDO_LIBERACAO'
  | 'BLOCO_ATIVO'
  | 'TOLERANCIA'
  | 'COOLDOWN'
  | 'SALDO_ZERADO';

export type FaseTela = FaseBloqueio | 'PAUSA_INTENCAO';

export interface ConfigBloco {
  duracaoBlocoMin: number;
  toleranciaMin: number;
  cooldownMin: number;
  blocosDiarios: number;
  blocoPorTarefaExtra: number;
}

export const CONFIG_BLOCO_PADRAO: ConfigBloco = {
  duracaoBlocoMin: 15,
  toleranciaMin: 2,
  cooldownMin: 30,
  blocosDiarios: 4,
  blocoPorTarefaExtra: 1,
};

/** Duração da pausa de intenção por bloco já liberado no dia; o último valor é o teto. Fixa no código por enquanto. */
export const SEQUENCIA_PAUSA_INTENCAO_SEG = [5, 10, 20, 40, 60];

const MS_POR_MIN = 60_000;

export interface EstadoSaldo {
  /** YYYY-MM-DD local — virou o dia, tudo zera (reconciliar). */
  dia: string;
  fase: FaseBloqueio;
  saldo: number;
  blocosUsados: number;
  toleranciasUsadas: number;
  /** Já recebeu os `blocosDiarios` do essencial hoje (sem estorno se o usuário desmarcar depois). */
  essencialCreditado: boolean;
  /** Ids das tarefas extras que já renderam bloco — impede marcar/desmarcar/marcar de novo pra farmar. */
  extrasCreditadas: string[];
  /** Tempo em primeiro plano já gasto no bloco (ou na tolerância) em curso, sem contar o trecho aberto de `fgDesde`. */
  consumidoMs: number;
  /** A tolerância deste bloco já foi aceita (1 por bloco). */
  toleranciaUsada: boolean;
  /** Fase TOLERANCIA: false = oferta "+2 min" ainda pendente ("Tempo esgotado"), true = os 2 min correndo. */
  toleranciaAtiva: boolean;
  /** Epoch ms de quando o cooldown acaba (timestamp absoluto, nunca timer em memória). */
  fimCooldownEm: number;
  /** Epoch ms de quando o app bloqueado entrou em primeiro plano agora; 0 = fora de primeiro plano. */
  fgDesde: number;
}

export interface ResultadoTransicao {
  estado: EstadoSaldo;
  /** false = a ação não era válida no estado atual (estado devolvido sem mudança de ação). */
  ok: boolean;
}

export interface SnapshotParaSaldo {
  essencialCumprido: boolean;
  /** Ids das tarefas extras (não essenciais, não subtarefas) concluídas hoje. */
  extrasConcluidas: string[];
}

export function estadoInicialSaldo(dia: string): EstadoSaldo {
  return {
    dia,
    fase: 'BLOQUEADO_SEM_ESSENCIAL',
    saldo: 0,
    blocosUsados: 0,
    toleranciasUsadas: 0,
    essencialCreditado: false,
    extrasCreditadas: [],
    consumidoMs: 0,
    toleranciaUsada: false,
    toleranciaAtiva: false,
    fimCooldownEm: 0,
    fgDesde: 0,
  };
}

/** Campos ausentes ou inválidos (usuário que configurou antes desta regra existir) caem no padrão. */
export function resolverConfigBloco(
  regras: Partial<ConfigBloco> | null | undefined,
): ConfigBloco {
  const resolvido = { ...CONFIG_BLOCO_PADRAO };
  if (!regras) {
    return resolvido;
  }
  (Object.keys(CONFIG_BLOCO_PADRAO) as (keyof ConfigBloco)[]).forEach(chave => {
    const valor = regras[chave];
    if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0) {
      resolvido[chave] = valor;
    }
  });
  return resolvido;
}

/** Extrai só os campos de config presentes (pra preservar na gravação de regras). */
export function extrairConfigBloco(
  regras: Partial<ConfigBloco> | null | undefined,
): Partial<ConfigBloco> {
  const extraido: Partial<ConfigBloco> = {};
  if (!regras) {
    return extraido;
  }
  (Object.keys(CONFIG_BLOCO_PADRAO) as (keyof ConfigBloco)[]).forEach(chave => {
    if (regras[chave] !== undefined) {
      extraido[chave] = regras[chave];
    }
  });
  return extraido;
}

/** Pausa de intenção antes de liberar o próximo bloco: 5s, 10s, 20s, 40s, depois 60s. */
export function duracaoPausaIntencaoSeg(blocosUsados: number): number {
  const indice = Math.min(
    Math.max(0, blocosUsados),
    SEQUENCIA_PAUSA_INTENCAO_SEG.length - 1,
  );
  return SEQUENCIA_PAUSA_INTENCAO_SEG[indice];
}

/** Tarefas extras que rendem bloco: concluídas, não essenciais e que não são subtarefa de outra. */
export function extrasConcluidasDoDia(tarefas: Tarefa[]): string[] {
  return tarefas
    .filter(t => !t.essencial && t.concluida && !t.tarefaPaiId)
    .map(t => t.id);
}

/** Mesma regra do estado B da InterceptScreen: existe essencial e todas estão concluídas. */
export function essencialCumpridoNoDia(tarefas: Tarefa[]): boolean {
  const essenciais = tarefas.filter(t => t.essencial);
  return essenciais.length > 0 && essenciais.every(t => t.concluida);
}

export function permiteUso(estado: EstadoSaldo): boolean {
  return (
    estado.fase === 'BLOCO_ATIVO' ||
    (estado.fase === 'TOLERANCIA' && estado.toleranciaAtiva)
  );
}

function entrarEmCooldown(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  instante: number,
): EstadoSaldo {
  return {
    ...estado,
    fase: 'COOLDOWN',
    fimCooldownEm: instante + cfg.cooldownMin * MS_POR_MIN,
    consumidoMs: 0,
    toleranciaAtiva: false,
    fgDesde: 0,
  };
}

/**
 * Aplica o que o passar do tempo já decidiu: virada do dia, bloco/tolerância
 * que se esgotou em primeiro plano, cooldown que acabou. Toda transição
 * chama isto antes de agir — assim o estado é sempre derivável só de
 * timestamps absolutos, mesmo que o app/aparelho tenha ficado parado.
 */
export function reconciliar(
  estadoAtual: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): EstadoSaldo {
  let s: EstadoSaldo =
    estadoAtual.dia !== dia ? estadoInicialSaldo(dia) : { ...estadoAtual };

  const emBloco = s.fase === 'BLOCO_ATIVO';
  if (emBloco || (s.fase === 'TOLERANCIA' && s.toleranciaAtiva)) {
    const limite = (emBloco ? cfg.duracaoBlocoMin : cfg.toleranciaMin) * MS_POR_MIN;
    const emCurso = s.fgDesde > 0 ? Math.max(0, agora - s.fgDesde) : 0;
    if (s.consumidoMs + emCurso >= limite) {
      const instanteFim =
        s.fgDesde > 0 ? s.fgDesde + (limite - s.consumidoMs) : agora;
      if (emBloco && cfg.toleranciaMin > 0) {
        s = {
          ...s,
          fase: 'TOLERANCIA',
          toleranciaAtiva: false,
          consumidoMs: 0,
          fgDesde: 0,
        };
      } else {
        s = entrarEmCooldown(s, cfg, instanteFim);
      }
    }
  }

  if (s.fase === 'COOLDOWN' && agora >= s.fimCooldownEm) {
    s.fase = s.saldo > 0 ? 'AGUARDANDO_LIBERACAO' : 'SALDO_ZERADO';
  }
  if (s.fase === 'SALDO_ZERADO' && s.saldo > 0) {
    s.fase = 'AGUARDANDO_LIBERACAO';
  }
  return s;
}

/**
 * Chamada a cada mudança em tarefas[] (snapshot do dia). Credita o essencial
 * (uma vez por dia) e cada tarefa extra nova (uma vez por id). Extras feitas
 * antes do essencial já ficam no saldo — só o desbloqueio espera o essencial.
 */
export function aplicarSnapshot(
  estado: EstadoSaldo,
  snapshot: SnapshotParaSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  const s = reconciliar(estado, cfg, agora, dia);

  const novas = snapshot.extrasConcluidas.filter(
    id => !s.extrasCreditadas.includes(id),
  );
  if (novas.length > 0) {
    s.extrasCreditadas = [...s.extrasCreditadas, ...novas];
    s.saldo += novas.length * cfg.blocoPorTarefaExtra;
  }

  if (snapshot.essencialCumprido && !s.essencialCreditado) {
    s.essencialCreditado = true;
    s.saldo += cfg.blocosDiarios;
    if (s.fase === 'BLOQUEADO_SEM_ESSENCIAL') {
      s.fase = 'AGUARDANDO_LIBERACAO';
    }
  }

  return { estado: reconciliar(s, cfg, agora, dia), ok: true };
}

/** Fim da pausa de intenção: consome 1 do saldo e abre o bloco. */
export function liberarBloco(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  const s = reconciliar(estado, cfg, agora, dia);
  if (s.fase !== 'AGUARDANDO_LIBERACAO' || s.saldo <= 0) {
    return { estado: s, ok: false };
  }
  return {
    estado: {
      ...s,
      fase: 'BLOCO_ATIVO',
      saldo: s.saldo - 1,
      blocosUsados: s.blocosUsados + 1,
      consumidoMs: 0,
      toleranciaUsada: false,
      toleranciaAtiva: false,
      fgDesde: 0,
    },
    ok: true,
  };
}

/** App bloqueado voltou ao primeiro plano — o relógio do bloco volta a correr. */
export function entrouEmPrimeiroPlano(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  const s = reconciliar(estado, cfg, agora, dia);
  if (permiteUso(s) && s.fgDesde === 0) {
    s.fgDesde = agora;
  }
  return { estado: s, ok: true };
}

/** App bloqueado saiu do primeiro plano (ou a tela apagou) — soma o trecho e pausa o relógio. */
export function saiuDePrimeiroPlano(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  let s = reconciliar(estado, cfg, agora, dia);
  if (s.fgDesde > 0) {
    s = { ...s, consumidoMs: s.consumidoMs + (agora - s.fgDesde), fgDesde: 0 };
  }
  return { estado: s, ok: true };
}

/** "+2 min para finalizar" — uma vez por bloco, só enquanto a oferta está pendente. */
export function usarTolerancia(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  const s = reconciliar(estado, cfg, agora, dia);
  const disponivel =
    s.fase === 'TOLERANCIA' &&
    !s.toleranciaAtiva &&
    !s.toleranciaUsada &&
    cfg.toleranciaMin > 0;
  if (!disponivel) {
    return { estado: s, ok: false };
  }
  return {
    estado: {
      ...s,
      toleranciaAtiva: true,
      toleranciaUsada: true,
      toleranciasUsadas: s.toleranciasUsadas + 1,
      consumidoMs: 0,
      fgDesde: 0,
    },
    ok: true,
  };
}

/** "Agora não" na oferta de tolerância — o cooldown começa neste instante. */
export function recusarTolerancia(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  const s = reconciliar(estado, cfg, agora, dia);
  if (s.fase !== 'TOLERANCIA' || s.toleranciaAtiva) {
    return { estado: s, ok: false };
  }
  return {
    estado: reconciliar(entrarEmCooldown(s, cfg, agora), cfg, agora, dia),
    ok: true,
  };
}

/**
 * Quantos ms faltam pro bloco/tolerância esgotar contando só primeiro plano;
 * null se o relógio não está correndo agora. Usado pra agendar o aviso
 * "Tempo esgotado" no Service.
 */
export function msAteEsgotar(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
): number | null {
  if (!permiteUso(estado) || estado.fgDesde === 0) {
    return null;
  }
  const limite =
    (estado.fase === 'BLOCO_ATIVO' ? cfg.duracaoBlocoMin : cfg.toleranciaMin) *
    MS_POR_MIN;
  return Math.max(0, limite - estado.consumidoMs - (agora - estado.fgDesde));
}

/** Ms de bloco/tolerância ainda disponíveis (relógio parado ou não) — pra exibir. */
export function msRestantes(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
): number {
  if (!permiteUso(estado)) {
    return 0;
  }
  const limite =
    (estado.fase === 'BLOCO_ATIVO' ? cfg.duracaoBlocoMin : cfg.toleranciaMin) *
    MS_POR_MIN;
  const emCurso = estado.fgDesde > 0 ? agora - estado.fgDesde : 0;
  return Math.max(0, limite - estado.consumidoMs - emCurso);
}

export function toleranciaDisponivel(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
): boolean {
  return (
    estado.fase === 'TOLERANCIA' &&
    !estado.toleranciaAtiva &&
    !estado.toleranciaUsada &&
    cfg.toleranciaMin > 0
  );
}

/** "MM:SS" a partir de ms (arredonda pra cima — 0:00 só quando de fato acabou). */
export function formatarContagemMs(ms: number): string {
  const totalSeg = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(totalSeg / 60);
  const segundos = totalSeg % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/** Resumo do dia gravado no Firestore (dailyLogs/{hoje}.resumoBloqueio) pra estatísticas futuras. */
export interface ResumoBloqueioDia {
  blocosUsados: number;
  toleranciasUsadas: number;
  intencoes: string[];
}
