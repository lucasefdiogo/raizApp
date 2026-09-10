import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { RootProgressIcon } from '../RootProgressIcon';

interface EmptyStateProps {
  titulo: string;
  corpo: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

/**
 * Estado vazio com identidade Rootora — "ainda não aconteceu nada aqui",
 * não "tela quebrada". Componente burro: recebe título, corpo e um CTA
 * opcional; não decide o texto nem a condição de exibição.
 */
export function EmptyState({
  titulo,
  corpo,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  const mostrarCta = ctaLabel !== undefined && onCtaPress !== undefined;

  return (
    <View style={styles.container} testID="empty-state">
      <RootProgressIcon variant="broto" tamanho={72} />
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.corpo}>{corpo}</Text>
      {mostrarCta && (
        <Pressable
          accessibilityRole="button"
          onPress={onCtaPress}
          hitSlop={8}
          style={styles.cta}
        >
          <Text style={styles.ctaTexto}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  titulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  cta: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  ctaTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
  },
});
