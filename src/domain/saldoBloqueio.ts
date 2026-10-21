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
 * "Liberar" valer. A sessão está disponível desde o início do dia: nenhuma
 * tarefa precisa ser feita para liberar. SALDO_ZERADO só existe com
 * blocosDiarios numérico: as sessões do dia acabaram e o cooldown terminou
 * (ver saldoDisponivel).
 */
export type FaseBloqueio =
  | 'AGUARDANDO_LIBERACAO'
  | 'SESSAO_ATIVA'
  | 'COOLDOWN'
  | 'SALDO_ZERADO'
  /** @deprecated compat temporário — removido na TASK-07/08. A máquina nova não produz. */
  | 'BLOQUEADO_SEM_ESSENCIAL'
  /** @deprecated compat temporário — removido na TASK-07/08. A máquina nova não produz. */
  | 'TOLERANCIA'
  /** @deprecated compat temporário — removido na TASK-07/08. A máquina nova não produz. */
  | 'BLOCO_ATIVO';

export type FaseTela = FaseBloqueio | 'PAUSA_INTENCAO';

export interface ConfigBloco {
  duracaoBlocoMin: number;
  /** Legado: a tolerância deixou de existir na máquina; o campo só segue aceito nas regras já salvas. */
  toleranciaMin: number;
  cooldownMin: number;
  /** null = sem limite de sessões por dia. */
  blocosDiarios: number | null;
  blocoPorTarefaExtra: number;
}

export const CONFIG_BLOCO_PADRAO: ConfigBloco = {
  duracaoBlocoMin: 15,
  toleranciaMin: 0,
  cooldownMin: 45,
  blocosDiarios: null,
  blocoPorTarefaExtra: 1,
};

/** Valores que eram o padrão antigo: salvos nas regras sem escolha do usuário, passam a valer o padrão novo. */
const PADRAO_ANTIGO: Partial<ConfigBloco> = {
  toleranciaMin: 2,
  cooldownMin: 30,
  blocosDiarios: 4,
};

/** Duração da pausa de intenção por bloco já liberado no dia; o último valor é o teto. Fixa no código por enquanto. */
export const SEQUENCIA_PAUSA_INTENCAO_SEG_V2 = [10, 20, 30, 40, 50, 60];

/** A sessão avisa quando falta este tempo para o fim. */
export const AVISO_FIM_SESSAO_MS = 60_000;

const MS_POR_MIN = 60_000;

export interface EstadoSaldo {
  /** YYYY-MM-DD local — virou o dia, tudo zera (reconciliar). */
  dia: string;
  fase: FaseBloqueio;
  /** Créditos de tarefas extras concluídas (soma ao limite diário em saldoDisponivel). */
  saldo: number;
  blocosUsados: number;
  /** Ids das tarefas extras que já renderam bloco — impede marcar/desmarcar/marcar de novo pra farmar. */
  extrasCreditadas: string[];
  /** Tempo em primeiro plano já gasto na sessão em curso, sem contar o trecho aberto de `fgDesde`. */
  consumidoMs: number;
  /** @deprecated compat temporário — removido na TASK-07/08. */
  toleranciasUsadas?: number;
  /** @deprecated compat temporário — removido na TASK-07/08. */
  toleranciaUsada?: boolean;
  /** @deprecated compat temporário — removido na TASK-07/08. */
  toleranciaAtiva?: boolean;
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
  /** Ids das tarefas extras (não essenciais, não subtarefas) concluídas hoje. */
  extrasConcluidas: string[];
}

export function estadoInicialDia(dia: string): EstadoSaldo {
  return {
    dia,
    fase: 'AGUARDANDO_LIBERACAO',
    saldo: 0,
    blocosUsados: 0,
    extrasCreditadas: [],
    consumidoMs: 0,
    fimCooldownEm: 0,
    fgDesde: 0,
  };
}

/**
 * @deprecated compat temporário — removido na TASK-07/08. Devolve o dia no
 * estado antigo (BLOQUEADO_SEM_ESSENCIAL) só para os testes de hook/tela que
 * ainda o assumem; a máquina nova usa estadoInicialDia.
 */
export function estadoInicialSaldo(dia: string): EstadoSaldo {
  return { ...estadoInicialDia(dia), fase: 'BLOQUEADO_SEM_ESSENCIAL' };
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
    if (
      typeof valor === 'number' &&
      Number.isFinite(valor) &&
      valor >= 0 &&
      (chave !== 'blocosDiarios' || Number.isInteger(valor)) &&
      valor !== PADRAO_ANTIGO[chave]
    ) {
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
      (extraido as Record<string, unknown>)[chave] = regras[chave];
    }
  });
  return extraido;
}

/** Pausa de intenção antes de liberar o próximo bloco: 10s, 20s, 30s, 40s, 50s, depois 60s. */
export function duracaoPausaIntencaoSeg(blocosUsados: number): number {
  const indice = Math.min(
    Math.max(0, blocosUsados),
    SEQUENCIA_PAUSA_INTENCAO_SEG_V2.length - 1,
  );
  return SEQUENCIA_PAUSA_INTENCAO_SEG_V2[indice];
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

/**
 * Sessões ainda disponíveis hoje: blocosDiarios - blocosUsados + créditos de
 * tarefas extras. null = sem limite (blocosDiarios não configurado).
 */
export function saldoDisponivel(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
): number | null {
  if (cfg.blocosDiarios === null) {
    return null;
  }
  return Math.max(0, cfg.blocosDiarios - estado.blocosUsados + estado.saldo);
}

export function permiteUso(estado: EstadoSaldo): boolean {
  return estado.fase === 'SESSAO_ATIVA';
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
    fgDesde: 0,
  };
}

/**
 * Aplica o que o passar do tempo já decidiu: virada do dia, sessão que se
 * esgotou em primeiro plano (vai direto ao cooldown), cooldown que acabou
 * (volta a AGUARDANDO_LIBERACAO, ou SALDO_ZERADO se o limite diário acabou). Toda transição chama isto antes de agir —
 * assim o estado é sempre derivável só de timestamps absolutos, mesmo que o
 * app/aparelho tenha ficado parado.
 */
export function reconciliar(
  estadoAtual: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): EstadoSaldo {
  let s: EstadoSaldo =
    estadoAtual.dia !== dia ? estadoInicialDia(dia) : { ...estadoAtual };

  if (s.fase === 'SESSAO_ATIVA') {
    const limite = cfg.duracaoBlocoMin * MS_POR_MIN;
    const emCurso = s.fgDesde > 0 ? Math.max(0, agora - s.fgDesde) : 0;
    if (s.consumidoMs + emCurso >= limite) {
      const instanteFim =
        s.fgDesde > 0 ? s.fgDesde + (limite - s.consumidoMs) : agora;
      s = entrarEmCooldown(s, cfg, instanteFim);
    }
  }

  if (s.fase === 'COOLDOWN' && agora >= s.fimCooldownEm) {
    s.fase = 'AGUARDANDO_LIBERACAO';
    if (saldoDisponivel(s, cfg) === 0) {
      s.fase = 'SALDO_ZERADO';
    }
  } else if (s.fase === 'SALDO_ZERADO' && saldoDisponivel(s, cfg) !== 0) {
    // crédito de tarefa extra (ou limite aumentado): volta a oferecer sessão
    s.fase = 'AGUARDANDO_LIBERACAO';
  }
  return s;
}

/**
 * Chamada a cada mudança em tarefas[] (snapshot do dia). Credita cada tarefa
 * extra nova (uma vez por id). O essencial não credita nada e o crédito não é
 * necessário para liberar a sessão; só muda a fase ao tirar de SALDO_ZERADO
 * (CA-07), via reconciliar.
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

  return { estado: reconciliar(s, cfg, agora, dia), ok: true };
}

/** Fim da pausa de intenção: abre a sessão. Só vale em AGUARDANDO_LIBERACAO. */
export function liberarBloco(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
  dia: string,
): ResultadoTransicao {
  const s = reconciliar(estado, cfg, agora, dia);
  if (s.fase !== 'AGUARDANDO_LIBERACAO') {
    return { estado: s, ok: false };
  }
  return {
    estado: {
      ...s,
      fase: 'SESSAO_ATIVA',
      blocosUsados: s.blocosUsados + 1,
      consumidoMs: 0,
      fgDesde: 0,
    },
    ok: true,
  };
}

/** App bloqueado voltou ao primeiro plano — o relógio da sessão volta a correr. */
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

/** Ms de sessão ainda disponíveis (relógio parado ou não) — pra exibir. */
export function msRestantes(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
): number {
  if (!permiteUso(estado)) {
    return 0;
  }
  const emCurso = estado.fgDesde > 0 ? agora - estado.fgDesde : 0;
  return Math.max(
    0,
    cfg.duracaoBlocoMin * MS_POR_MIN - estado.consumidoMs - emCurso,
  );
}

/**
 * Quantos ms faltam pra sessão esgotar contando só primeiro plano; null se o
 * relógio não está correndo agora. Usado pra agendar o fim no Service.
 */
export function msAteEsgotar(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
): number | null {
  if (!permiteUso(estado) || estado.fgDesde === 0) {
    return null;
  }
  return msRestantes(estado, cfg, agora);
}

/**
 * Quantos ms faltam pro aviso de "1 minuto restante" (0 se já passou do
 * ponto); null se o relógio não está correndo. Usado pra agendar o aviso.
 */
export function msAteAviso(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
): number | null {
  const faltam = msAteEsgotar(estado, cfg, agora);
  return faltam === null ? null : Math.max(0, faltam - AVISO_FIM_SESSAO_MS);
}

/** O aviso de "1 minuto restante" vale: sessão ativa, faltando 1 minuto ou menos e ainda não acabou. */
export function avisoUmMinutoAtivo(
  estado: EstadoSaldo,
  cfg: ConfigBloco,
  agora: number,
): boolean {
  const restante = msRestantes(estado, cfg, agora);
  return permiteUso(estado) && restante > 0 && restante <= AVISO_FIM_SESSAO_MS;
}

/** @deprecated compat temporário — removido na TASK-07/08. A máquina nova não tem tolerância. */
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
  sessoesUsadas: number;
  intencoes: string[];
}
