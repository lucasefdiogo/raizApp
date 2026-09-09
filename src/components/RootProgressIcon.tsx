import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';

interface RootProgressIconProps {
  ramoEnfraquecido?: boolean;
  tamanho?: number;
}

export function RootProgressIcon({
  ramoEnfraquecido = false,
  tamanho = 96,
}: RootProgressIconProps) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 96 96"
      accessibilityLabel="Ilustração do sistema de raízes"
    >
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
        strokeWidth={ramoEnfraquecido ? 2 : 4}
        strokeOpacity={ramoEnfraquecido ? 0.35 : 1}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
