import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../theme';

export type RootProgressIconVariant = 'completo' | 'reduzido' | 'escudo';

interface RootProgressIconProps {
  variant?: RootProgressIconVariant;
  tamanho?: number;
}

/**
 * variant 'reduzido' reproduz o visual já usado no slide 3 do tutorial e na
 * tela de recaída (ramo mais fino e translúcido — streak caiu, sem escudo).
 * variant 'escudo' é visualmente distinta: ramo com a MESMA largura normal,
 * só com opacidade reduzida ("em pausa", não cortado — o escudo protegeu o
 * dia). variant 'completo' é o estado de celebração de marco: as mesmas
 * raízes só que todas firmes, mais uma 3ª raiz e o ponto de crescimento em
 * Cobre no topo do tronco. Em nenhuma variante a raiz principal (o path
 * central) muda — ela nunca desaparece.
 */
export function RootProgressIcon({
  variant = 'completo',
  tamanho = 96,
}: RootProgressIconProps) {
  const reduzido = variant === 'reduzido';
  const escudo = variant === 'escudo';

  return (
    <Svg
      testID="root-progress-icon"
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
        testID="root-progress-icon-ramo-variavel"
        d="M48 56 C56 60 62 64 66 74"
        stroke={theme.colors.musgo}
        strokeWidth={reduzido ? 2 : 4}
        strokeOpacity={reduzido ? 0.35 : escudo ? 0.5 : 1}
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
