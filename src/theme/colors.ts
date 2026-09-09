// Paleta Raiz — Terra Escura, Cobre, Musgo, Areia
export const colors = {
  terraEscura: '#2B2118',
  terraEscura2: '#3E3126',
  cobre: '#C1702F',
  cobreClaro: '#DA9A63',
  musgo: '#5C6B4A',
  musgoClaro: '#8A9678',
  areia: '#EFE6D6',
  areiaClara: '#F8F3E9',
  branco: '#FFFFFF',
  erro: '#B5473A',

  background: '#F8F3E9',
  surface: '#FFFFFF',
  textPrimary: '#2B2118',
  textSecondary: '#5C6B4A',
  accent: '#C1702F',
  border: '#E3D8C3',
} as const;

export type ColorToken = keyof typeof colors;
