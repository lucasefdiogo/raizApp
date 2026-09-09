import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

interface PrimaryButtonProps {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
}

export function PrimaryButton({
  titulo,
  onPress,
  desabilitado = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        styles.botao,
        desabilitado && styles.botaoDesabilitado,
        pressed && !desabilitado && styles.botaoPressionado,
      ]}
    >
      <Text style={styles.texto}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: theme.colors.cobre,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  botaoPressionado: {
    opacity: 0.85,
  },
  botaoDesabilitado: {
    backgroundColor: theme.colors.border,
  },
  texto: {
    color: theme.colors.branco,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
});
