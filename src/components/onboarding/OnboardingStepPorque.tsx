import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';

interface OnboardingStepPorqueProps {
  valor: string;
  onAlterar: (texto: string) => void;
}

export function OnboardingStepPorque({
  valor,
  onAlterar,
}: OnboardingStepPorqueProps) {
  return (
    <View>
      <Text style={styles.titulo}>Por que você quer estar aqui</Text>
      <Text style={styles.descricao}>
        Escreva com suas palavras. Isso volta a aparecer para você em momentos
        de recomeço.
      </Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Ex: Quero terminar meus estudos sem me sentir sobrecarregado"
        placeholderTextColor={theme.colors.textSecondary}
        value={valor}
        onChangeText={onAlterar}
        accessibilityLabel="Seu porquê pessoal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  descricao: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
});
