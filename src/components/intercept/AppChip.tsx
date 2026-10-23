import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface AppChipProps {
  iconeBase64: string;
  nome: string;
}

/**
 * Chip com o ícone e o nome do app interceptado, no topo de toda tela do
 * root `Intercept` (HU-11, RN01). Burro — ícone já vem PNG em base64 do
 * PackageManager (ver RootoraAccessibilityModule.listarAppsInstalados).
 */
export function AppChip({ iconeBase64, nome }: AppChipProps) {
  return (
    <View style={styles.chip}>
      <Image
        testID="app-chip-icone"
        source={{ uri: `data:image/png;base64,${iconeBase64}` }}
        style={styles.icone}
      />
      <Text style={styles.nome}>{nome}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'center',
  },
  icone: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
  },
  nome: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
