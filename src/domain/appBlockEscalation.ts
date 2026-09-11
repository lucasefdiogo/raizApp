/**
 * Custo crescente entre desbloqueios de apps bloqueados (Fase 3, último
 * incremento) — desestimula abusar do próprio sistema de bloqueio sem virar
 * proibição total (mesmo princípio já usado no streak/escudo: fricção
 * crescente, nunca punição binária). Funções puras, sem React/Firebase.
 *
 * Decisões fechadas (ver spec da tarefa — não reabrir aqui):
 * - Escala a EXIGÊNCIA do desbloqueio, nunca a duração da liberação (que
 *   continua sempre 15 minutos, em registrarDesbloqueioTemporario).
 * - Contagem é o TOTAL de desbloqueios do dia, somando todos os apps —
 *   trocar de app não deixa cada um "mais barato".
 * - Teto no nível 3 — do 3º desbloqueio do dia em diante, não fica mais
 *   difícil que isso.
 */
export type NivelDesbloqueio = 1 | 2 | 3;

const NIVEL_TETO = 3;

const DURACAO_RESPIRACAO_SEGUNDOS_POR_NIVEL: Record<NivelDesbloqueio, number> = {
  1: 60,
  2: 90,
  3: 120,
};

/**
 * `desbloqueiosHoje` é quantos desbloqueios bem-sucedidos JÁ aconteceram
 * hoje (o que está gravado agora); o nível retornado é o do PRÓXIMO
 * desbloqueio, sempre +1 em relação a isso, com teto em 3.
 */
export function calcularNivelDesbloqueio(
  desbloqueiosHoje: number,
): NivelDesbloqueio {
  return Math.min(desbloqueiosHoje + 1, NIVEL_TETO) as NivelDesbloqueio;
}

export function obterDuracaoRespiracao(nivel: NivelDesbloqueio): number {
  return DURACAO_RESPIRACAO_SEGUNDOS_POR_NIVEL[nivel];
}

export function exigeReflexao(nivel: NivelDesbloqueio): boolean {
  return nivel >= 2;
}
