// Fontes definidas conforme 02-identidade-visual.md — vinculadas
// nativamente em android/app/src/main/assets/fonts/ (Zilla Slab e IBM Plex
// Sans nos pesos certos: Medium/SemiBold, não Regular/Bold; Space Mono
// Regular). Cada valor abaixo precisa bater EXATAMENTE com o nome do
// arquivo .ttf (sem extensão) — Android resolve a fonte por esse nome, e
// diverge do que a família originalmente é chamada "por fora".
export const fontFamily = {
  heading: 'ZillaSlab-Medium',
  headingBold: 'ZillaSlab-SemiBold',
  body: 'IBMPlexSans-Regular',
  bodyMedium: 'IBMPlexSans-Medium',
  bodySemiBold: 'IBMPlexSans-SemiBold',
  mono: 'SpaceMono-Regular',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  fontFamily,
  fontSize,
} as const;
