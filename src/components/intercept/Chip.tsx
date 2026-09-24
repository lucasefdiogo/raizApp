import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

interface ChipProps {
  titulo: string;
  onPress: () => void;
}

/** Chip de toque único do Passo 1 do TravadoFlow — sem campo de texto livre (seção 4 da spec). */
export function Chip({ titulo, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressionado]}
    >
      <Text style={styles.texto}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  chipPressionado: {
    opacity: 0.7,
  },
  texto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
