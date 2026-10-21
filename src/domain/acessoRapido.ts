// Acesso rápido (HU-05): cota diária e intervalos crescentes entre usos.
// Funções PURAS — sem relógio, React ou Firebase; `agora` é epoch ms.

import { EstadoAcessoRapido } from './types';

/** Usos do acesso rápido por dia. Fixo no código por enquanto. */
export const ACESSOS_RAPIDOS_DIARIOS = 3;

/**
 * Intervalo mínimo, em minutos, depois do 1º, 2º e 3º uso do dia. O 3º não
 * abre um 4º uso (a cota acaba); o valor fica por completude da regra.
 */
export const INTERVALOS_ACESSO_RAPIDO_MIN = [15, 30, 60];

const MS_POR_MIN = 60_000;

/**
 * Ms até o próximo acesso rápido liberar, contados do fim do acesso
 * anterior. 0 = disponível agora; null = cota do dia esgotada.
 */
export function msAteProximoAcessoRapido(
  estado: EstadoAcessoRapido,
  agora: number,
): number | null {
  if (estado.usosHoje >= ACESSOS_RAPIDOS_DIARIOS) return null;
  if (estado.usosHoje <= 0) return 0;
  const intervaloMin = INTERVALOS_ACESSO_RAPIDO_MIN[estado.usosHoje - 1];
  const liberaEm = estado.fimUltimoEm + intervaloMin * MS_POR_MIN;
  return Math.max(0, liberaEm - agora);
}

export function acessoRapidoDisponivel(
  estado: EstadoAcessoRapido,
  agora: number,
): boolean {
  return msAteProximoAcessoRapido(estado, agora) === 0;
}

export interface EntradaEmergencia {
  sessaoAtiva: boolean;
  /** Cooldown que o usuário ainda pode liberar (RN-04 da HU-04). */
  cooldownLiberavel: boolean;
  acessoRapido: EstadoAcessoRapido;
  agora: number;
}

/** A emergência só aparece quando nenhuma opção melhor está disponível (RN-06). */
export function emergenciaOferecida(entrada: EntradaEmergencia): boolean {
  return (
    !entrada.sessaoAtiva &&
    !entrada.cooldownLiberavel &&
    !acessoRapidoDisponivel(entrada.acessoRapido, entrada.agora)
  );
}
