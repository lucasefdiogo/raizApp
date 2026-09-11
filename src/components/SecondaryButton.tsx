import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

interface SecondaryButtonProps {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
}

/**
 * Botão de ação secundária (ex: "Voltar" ao lado de um `PrimaryButton`).
 * Contorno em Musgo, sem preenchimento — nunca Cobre, pra sobrar só uma
 * ação em destaque por tela (ver regra de paleta em 02-identidade-visual.md).
 */
export function SecondaryButton({
  titulo,
  onPress,
  desabilitado = false,
}: SecondaryButtonProps) {
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
      <Text
        style={[styles.texto, desabilitado && styles.textoDesabilitado]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderWidth: 1.5,
    borderColor: theme.colors.musgo,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  botaoPressionado: {
    opacity: 0.7,
  },
  botaoDesabilitado: {
    borderColor: theme.colors.border,
  },
  texto: {
    color: theme.colors.musgo,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  textoDesabilitado: {
    color: theme.colors.textSecondary,
  },
});
