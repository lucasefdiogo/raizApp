// Paleta Raiz — fonte única de verdade: 02-identidade-visual.md (decisão
// fechada desde o início do projeto). Os 6 hex abaixo são os únicos
// documentados lá — qualquer outro tom (terraEscura2, cobreClaro,
// musgoClaro, erro) é um extra do código, não da identidade original (ver
// comentário junto de cada um).
export const colors = {
  /** Fundo padrão de toda tela — único tom de fundo, não dois. */
  casca: '#EFEAE0',
  terraEscura: '#2B2318',
  /** Texto secundário, labels, placeholders (papel definido no documento). */
  terraSuave: '#6B5E45',
  cobre: '#B5772E',
  musgo: '#3E4A34',
  /** Fundo de cards, inputs, chips, citações. */
  areia: '#E3DACB',

  /**
   * Fora da paleta original — usado só como reforço de contraste no rodapé
   * do StreakCard (ver uso). Não fazia parte de 02-identidade-visual.md;
   * mantido por ora (não pedido pra remover nesta tarefa).
   */
  terraEscura2: '#3E3126',
  /**
   * Fora da paleta original. Tom mais claro/saturado de Cobre — usado em
   * StreakCard (rodapé) e nos chips selecionados do onboarding.
   */
  cobreClaro: '#DA9A63',
  /**
   * Fora da paleta original. Tom mais claro de Musgo — usado no "✓" do
   * TaskCompletedOverlay.
   */
  musgoClaro: '#8A9678',
  /**
   * Fora da paleta original — cor de erro/alerta. Vários usos hoje (campos
   * inválidos, exclusão de conta, etc.) — avaliar numa tarefa própria se
   * cada um deveria mesmo ser uma cor de alerta ou um tom sóbrio da
   * paleta (ver auditoria do design-system-rootora.md).
   */
  erro: '#B5473A',

  // Camada semântica — nomes que os componentes de fato usam no dia a dia,
  // cada um apontando pro token correto da paleta acima.
  background: '#EFEAE0', // = casca
  surface: '#E3DACB', // = areia — cards/inputs não são "brancos", são Areia sobre Casca
  textPrimary: '#2B2318', // = terraEscura
  textSecondary: '#6B5E45', // = terraSuave (papel documentado: texto secundário)
  accent: '#B5772E', // = cobre
  border: '#E3D8C3',
  overlay: 'rgba(43, 35, 24, 0.6)', // = terraEscura com alpha
} as const;

export type ColorToken = keyof typeof colors;
