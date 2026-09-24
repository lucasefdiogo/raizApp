import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../theme';
import { calcularAlturaCaule } from '../domain/rootGrowth';

export type RootProgressIconVariant =
  | 'completo'
  | 'reduzido'
  | 'escudo'
  | 'broto';

interface RootProgressIconProps {
  variant?: RootProgressIconVariant;
  tamanho?: number;
  /**
   * Dias de sequência atual — quando presente (e variant !== 'broto'), o
   * caule principal é desenhado com a altura de calcularAlturaCaule
   * (domain/rootGrowth.ts) em vez da altura fixa de sempre. Os ramos
   * continuam aparecendo por marco, exatamente como hoje — só o
   * comprimento do caule central passa a refletir o progresso contínuo.
   * Ausente: comportamento inalterado (altura fixa de sempre — mesmo valor
   * que calcularAlturaCaule(90) produz, então nenhum uso existente muda).
   */
  diasSequencia?: number;
}

export const ALTURA_CAULE_PADRAO = 88;

function arredondado(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Caminho do caule principal, escalado proporcionalmente pra `altura` (px
 * do viewBox) — preserva a curvatura visual de hoje (pontos de controle nas
 * mesmas frações do comprimento), só varia o comprimento final. Exportada
 * pra ser reaproveitada por RootWateringOverlay, que desenha o mesmo caule
 * numa camada animada separada por cima deste componente (ver lá).
 */
export function caminhoCaule(altura: number): string {
  const topo = 4;
  const controle1 = arredondado(topo + altura * (24 / ALTURA_CAULE_PADRAO));
  const controle2 = arredondado(topo + altura * (36 / ALTURA_CAULE_PADRAO));
  const fim = arredondado(topo + altura);
  return `M48 ${topo} C48 ${controle1} 48 ${controle2} 48 ${fim}`;
}

/**
 * variant 'reduzido' reproduz o visual já usado no slide 3 do tutorial e na
 * tela de recaída (ramo mais fino e translúcido — streak caiu, sem escudo).
 * variant 'escudo' é visualmente distinta: ramo com a MESMA largura normal,
 * só com opacidade reduzida ("em pausa", não cortado — o escudo protegeu o
 * dia). variant 'completo' é o estado de celebração de marco: as mesmas
 * raízes só que todas firmes, mais uma 3ª raiz e o ponto de crescimento em
 * Cobre no topo do tronco. variant 'broto' é o estado de "ainda não começou
 * nada": só o ponto de crescimento (Cobre) e um traço curto saindo dele —
 * nenhuma ramificação ainda. Em nenhuma variante a raiz principal (o path
 * central) desaparece por completo; no 'broto' ela é só um começo.
 */
export function RootProgressIcon({
  variant = 'completo',
  tamanho = 96,
  diasSequencia,
}: RootProgressIconProps) {
  const reduzido = variant === 'reduzido';
  const escudo = variant === 'escudo';
  const completo = variant === 'completo';
  const broto = variant === 'broto';

  const alturaCaule =
    diasSequencia !== undefined
      ? calcularAlturaCaule(diasSequencia)
      : ALTURA_CAULE_PADRAO;

  return (
    <Svg
      testID="root-progress-icon"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 96 96"
      accessibilityLabel="Ilustração do sistema de raízes"
    >
      {(completo || broto) && (
        <Circle
          testID="root-progress-icon-ponto"
          cx={48}
          cy={4}
          r={5}
          fill={theme.colors.cobre}
        />
      )}
      <Path
        testID="root-progress-icon-caule"
        d={broto ? 'M48 8 C48 16 48 22 48 32' : caminhoCaule(alturaCaule)}
        stroke={theme.colors.musgo}
        strokeWidth={broto ? 4 : 6}
        strokeLinecap="round"
        fill="none"
      />
      {!broto && (
        <Path
          d="M48 40 C40 46 34 50 30 62"
          stroke={theme.colors.musgo}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {!broto && (
        <Path
          testID="root-progress-icon-ramo-variavel"
          d="M48 56 C56 60 62 64 66 74"
          stroke={theme.colors.musgo}
          strokeWidth={reduzido ? 2 : 4}
          strokeOpacity={reduzido ? 0.35 : escudo ? 0.5 : 1}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {completo && (
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
