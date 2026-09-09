import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../theme';

export type RootProgressIconVariant = 'completo' | 'recaida';

interface RootProgressIconProps {
  variant?: RootProgressIconVariant;
  tamanho?: number;
}

/**
 * variant 'recaida' reproduz o visual já usado no slide 3 do tutorial (ramo
 * mais fino/translúcido) — não alterar essa variante sem revalidar aquela
 * tela. variant 'completo' é o estado de celebração de marco: as mesmas
 * raízes só que todas firmes, mais uma 3ª raiz e o ponto de crescimento em
 * Cobre no topo do tronco.
 */
export function RootProgressIcon({
  variant = 'completo',
  tamanho = 96,
}: RootProgressIconProps) {
  const enfraquecido = variant === 'recaida';

  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 96 96"
      accessibilityLabel="Ilustração do sistema de raízes"
    >
      {variant === 'completo' && (
        <Circle cx={48} cy={4} r={5} fill={theme.colors.cobre} />
      )}
      <Path
        d="M48 4 C48 28 48 40 48 92"
        stroke={theme.colors.musgo}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M48 40 C40 46 34 50 30 62"
        stroke={theme.colors.musgo}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M48 56 C56 60 62 64 66 74"
        stroke={theme.colors.musgo}
        strokeWidth={enfraquecido ? 2 : 4}
        strokeOpacity={enfraquecido ? 0.35 : 1}
        strokeLinecap="round"
        fill="none"
      />
      {variant === 'completo' && (
        <Path
          d="M48 70 C42 76 38 82 34 90"
          stroke={theme.colors.musgo}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Svg>
  );
}
