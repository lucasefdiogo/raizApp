// Fontes definidas conforme fundamentação teórica do projeto.
// Os arquivos de fonte ainda não foram vinculados nativamente — até lá, o
// Android usa a fonte padrão do sistema como fallback automático.
export const fontFamily = {
  heading: 'ZillaSlab-Regular',
  headingBold: 'ZillaSlab-Bold',
  body: 'IBMPlexSans-Regular',
  bodyMedium: 'IBMPlexSans-Medium',
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
