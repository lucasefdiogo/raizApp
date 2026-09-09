import { colors } from './colors';
import { typography } from './typography';
import { radius, spacing } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
} as const;

export type Theme = typeof theme;

export { colors, typography, spacing, radius };
