// Lista ordenada de "OUTRAS SAÍDAS" da interceptação (HU-11, RN02/RN11).
// Função PURA — sem relógio, React ou Firebase; quem decide disponibilidade
// (saldo, emergência) continua em domain/acessoRapido.ts e useBloqueioSaldo.

import { ACESSOS_RAPIDOS_DIARIOS } from './acessoRapido';

export type TipoValvula = 'acesso_rapido' | 'emergencia' | 'sessao_foco' | 'tarefas_extras';

export interface Valvula {
  tipo: TipoValvula;
  titulo: string;
  /** Uma linha, nunca negativa ("bloqueado", "acabou", "não pode") — RN02. */
  descricao: string;
  /** Space Mono, à direita. Vazio = sem meta (RN11 — tarefas extras sem pendentes). */
  meta: string;
  disponivel: boolean;
}

interface ParametrosValvulas {
  acessoRapidoDisponivel: boolean;
  usosAcessoRapidoHoje: number;
  /** null = cota do dia esgotada. */
  msAteProximoAcessoRapido: number | null;
  emergenciaOferecida: boolean;
  /** 5s fora da janela noturna, 30s dentro (RN09). */
  esperaAcessoRapidoSeg: number;
  /** Quantidade de tarefas extras pendentes hoje. */
  tarefasExtrasPendentes: number;
}

function valvulaAcessoRapido(params: ParametrosValvulas): Valvula {
  if (params.acessoRapidoDisponivel) {
    const restantes = ACESSOS_RAPIDOS_DIARIOS - params.usosAcessoRapidoHoje;
    return {
      tipo: 'acesso_rapido',
      titulo: 'Acesso rápido',
      descricao: `2 minutos, depois de ${params.esperaAcessoRapidoSeg}s`,
      meta: `${restantes} DE ${ACESSOS_RAPIDOS_DIARIOS} HOJE`,
      disponivel: true,
    };
  }
  if (params.msAteProximoAcessoRapido === null) {
    return {
      tipo: 'acesso_rapido',
      titulo: 'Acesso rápido',
      descricao: 'Volta amanhã',
      meta: 'AMANHÃ',
      disponivel: false,
    };
  }
  const minutos = Math.ceil(Math.max(0, params.msAteProximoAcessoRapido) / 60_000);
  return {
    tipo: 'acesso_rapido',
    titulo: 'Acesso rápido',
    descricao: `Próximo disponível em ${minutos} min`,
    meta: `EM ${minutos} MIN`,
    disponivel: false,
  };
}

const VALVULA_EMERGENCIA: Valvula = {
  tipo: 'emergencia',
  titulo: 'Saída de emergência',
  descricao: 'Respirar 60s e liberar 2 min',
  meta: 'SEM LIMITE',
  disponivel: true,
};

const VALVULA_SESSAO_FOCO: Valvula = {
  tipo: 'sessao_foco',
  titulo: 'Sessão de foco',
  descricao: '5 minutos, sem tarefa',
  meta: '5 MIN',
  disponivel: true,
};

function valvulaTarefasExtras(tarefasExtrasPendentes: number): Valvula {
  return {
    tipo: 'tarefas_extras',
    titulo: 'Tarefas extras',
    descricao: 'Concluir uma devolve uma sessão',
    meta: tarefasExtrasPendentes > 0 ? String(tarefasExtrasPendentes) : '',
    disponivel: true,
  };
}

/**
 * Ordem das válvulas em "OUTRAS SAÍDAS" (RN11): acesso rápido disponível
 * sempre lidera; indisponível (intervalo ou cota esgotada) com emergência
 * oferecida, a emergência assume o topo. Sessão de foco e tarefas extras
 * sempre por último, nessa ordem.
 */
export function montarValvulas(params: ParametrosValvulas): Valvula[] {
  const acessoRapido = valvulaAcessoRapido(params);
  const resto = [VALVULA_SESSAO_FOCO, valvulaTarefasExtras(params.tarefasExtrasPendentes)];

  if (!params.acessoRapidoDisponivel && params.emergenciaOferecida) {
    return [VALVULA_EMERGENCIA, acessoRapido, ...resto];
  }
  return [acessoRapido, ...resto];
}
