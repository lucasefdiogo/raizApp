import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

interface SecondaryButtonProps {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
}

/**
 * Botão de ação secundária/ghost — único tratamento pra esse tipo de ação
 * no app (ex: "Voltar" ao lado de um `PrimaryButton`, "Continuar com
 * Google", o botão secundário do tutorial). Contorno neutro em Terra
 * Suave, sem preenchimento — nunca Cobre, pra sobrar só uma ação em
 * destaque por tela (ver regra de paleta em 02-identidade-visual.md), e
 * nunca Musgo: essa cor já significa "concluído/estrutura" em outro lugar
 * do app (checkbox de tarefa feita, ramos do RootProgressIcon) — reusá-la
 * aqui misturaria os dois significados.
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
    borderColor: theme.colors.terraSuave,
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
    color: theme.colors.terraSuave,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  // `border` (mais claro), não `textSecondary` — hoje textSecondary tem o
  // mesmo valor de terraSuave, então usar ele aqui apagaria a distinção
  // visual entre habilitado/desabilitado.
  textoDesabilitado: {
    color: theme.colors.border,
  },
});
