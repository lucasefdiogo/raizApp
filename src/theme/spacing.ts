export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// 02-identidade-visual.md pede cantos suavemente arredondados (10-14px) —
// sm/md caem dentro da faixa; lg (superfícies maiores, modais/cartões
// grandes) escala um pouco acima pra manter a progressão da escala.
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  full: 999,
} as const;
