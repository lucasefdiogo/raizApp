// Crescimento CONTÍNUO do caule do RootProgressIcon, em px do viewBox
// 0-96 (mesmo sistema de coordenadas do SVG — ver RootProgressIcon.tsx).
//
// Curva LOGARÍTMICA, não linear: cada dia adiciona menos altura que o
// anterior. Racional (fundamentação teórica, seção 10.1): autoeficácia se
// constrói por experiências de domínio acumuladas, e os primeiros dias são
// os mais difíceis e os que mais importam pra sustentar o hábito — o
// crescimento visual precisa refletir isso (dia 1 rende mais que o dia 30),
// não crescer no mesmo ritmo o tempo todo. Também resolve o limite físico
// da tela: uma curva linear estouraria o viewBox bem antes do dia 90.
//
// ALTURA_MINIMA (24) = comprimento do caule na variante 'broto' do
// RootProgressIcon (de y=8 a y=32) — ponto de partida visual quando ainda
// não há sequência nenhuma (diasSequencia 0).
// ALTURA_MAXIMA (88) = comprimento do caule na variante 'completo' de hoje
// (de y=4 a y=92) — teto atingido no último marco de streak (90 dias),
// e nunca ultrapassado depois disso (satura, não continua crescendo).
const ALTURA_MINIMA = 24;
const ALTURA_MAXIMA = 88;
const DIA_TETO = 90;

// k resolvido pra que altura(DIA_TETO) bata exatamente em ALTURA_MAXIMA:
// ALTURA_MAXIMA = ALTURA_MINIMA + k * ln(DIA_TETO + 1)  =>  k = (ALTURA_MAXIMA - ALTURA_MINIMA) / ln(DIA_TETO + 1)
const K_CRESCIMENTO = (ALTURA_MAXIMA - ALTURA_MINIMA) / Math.log(DIA_TETO + 1);

/**
 * Altura do caule (px do viewBox) pra uma sequência de `diasSequencia` dias.
 * Cresce rápido nos primeiros dias e achata perto do teto (90 dias) — ver
 * racional da curva no topo do arquivo. Negativo é tratado como 0 (nenhuma
 * sequência); acima de 90 satura em ALTURA_MAXIMA, não continua crescendo.
 */
export function calcularAlturaCaule(diasSequencia: number): number {
  const dias = Math.min(Math.max(diasSequencia, 0), DIA_TETO);
  return ALTURA_MINIMA + K_CRESCIMENTO * Math.log(dias + 1);
}
