import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface SecaoConfigProps {
  eyebrow: string;
  link?: { rotulo: string; onPress: () => void };
  children: React.ReactNode;
}

/**
 * Cabeçalho de seção da `BloqueioAppsScreen` (HU-09, RN01): eyebrow em Space
 * Mono + link opcional à direita ("Como funciona", "Editar") + conteúdo.
 * Burro — não decide nada, só organiza o que o chamador já resolveu.
 */
export function SecaoConfig({ eyebrow, link, children }: SecaoConfigProps) {
  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {link && (
          <Pressable
            accessibilityRole="button"
            onPress={link.onPress}
            hitSlop={8}
            style={styles.link}
          >
            <Text style={styles.linkTexto}>{link.rotulo}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
