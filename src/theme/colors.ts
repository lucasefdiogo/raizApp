// Paleta Raiz — Terra Escura, Cobre, Musgo, Areia
export const colors = {
  terraEscura: '#2B2118',
  terraEscura2: '#3E3126',
  /**
   * Terra Suave — neutro quente pra estados inativos/de baixa ênfase (ex:
   * aba não selecionada na tab bar). Deliberadamente distinto de musgo
   * (#5C6B4A) e de textSecondary (que hoje usa o hex do musgo) — musgo já
   * carrega o significado de estrutura/conclusão em outros lugares do app,
   * e não deve ser reaproveitado como "neutro".
   */
  terraSuave: '#8A7E6C',
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
  overlay: 'rgba(43, 33, 24, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
