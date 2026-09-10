import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { RootProgressIcon } from '../RootProgressIcon';

const DURACAO_PULSO_MS = 900;
const ESCALA_MIN = 0.95;
const ESCALA_MAX = 1.05;
const OPACIDADE_MIN = 0.6;

const TAMANHO_ICONE = {
  fullscreen: 96,
  inline: 48,
} as const;

interface LoadingIndicatorProps {
  variant: 'fullscreen' | 'inline';
  label?: string;
}

/**
 * Peça única de "espera" do app. Componente burro: recebe variant e label
 * por prop, não sabe de onde vem o estado de carregamento.
 *
 * - 'fullscreen': cobre a tela com o fundo da marca — pra quando ainda não
 *   há layout nenhum embaixo.
 * - 'inline': versão compacta, não cobre nada — pra dentro de uma tela que
 *   já tem cabeçalho/estrutura montada.
 *
 * Anima com Animated do core do RN (Reanimated não está no projeto): um
 * pulso suave em loop no RootProgressIcon — mesma assinatura visual da
 * Splash e dos estados de recaída — em vez de rotação de spinner, que
 * cansa mais rápido. O loop para sozinho no unmount.
 */
export function LoadingIndicator({
  variant,
  label = 'Carregando',
}: LoadingIndicatorProps) {
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1,
          duration: DURACAO_PULSO_MS,
          useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 0,
          duration: DURACAO_PULSO_MS,
          useNativeDriver: true,
        }),
      ]),
    );

    animacao.start();
    return () => animacao.stop();
  }, [pulso]);

  const escala = pulso.interpolate({
    inputRange: [0, 1],
    outputRange: [ESCALA_MIN, ESCALA_MAX],
  });
  const opacidade = pulso.interpolate({
    inputRange: [0, 1],
    outputRange: [OPACIDADE_MIN, 1],
  });

  const fullscreen = variant === 'fullscreen';

  return (
    <View
      testID="loading-indicator"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={fullscreen ? styles.fullscreen : styles.inline}
    >
      <Animated.View
        style={{ transform: [{ scale: escala }], opacity: opacidade }}
      >
        <RootProgressIcon variant="completo" tamanho={TAMANHO_ICONE[variant]} />
      </Animated.View>
      <Text style={fullscreen ? styles.labelFullscreen : styles.labelInline}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  labelFullscreen: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  labelInline: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
