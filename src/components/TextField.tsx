import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme';

export type TextFieldRef = React.ComponentRef<typeof TextInput>;

// Mesma altura mínima do campo de porquê do onboarding
// (components/onboarding/OnboardingStepPorque.tsx) — os dois devem parecer
// iguais.
const ALTURA_MINIMA_MULTILINHA = 120;

interface TextFieldProps extends TextInputProps {
  label: string;
  erro?: string;
}

export const TextField = forwardRef<TextFieldRef, TextFieldProps>(
  function TextFieldBase({ label, erro, style, multiline, ...resto }, ref) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[
          styles.input,
          multiline && styles.inputMultilinha,
          erro && styles.inputComErro,
          style,
        ]}
        multiline={multiline}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={label}
        {...resto}
      />
      {erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  inputMultilinha: {
    minHeight: ALTURA_MINIMA_MULTILINHA,
    textAlignVertical: 'top',
  },
  inputComErro: {
    borderColor: theme.colors.erro,
  },
  erro: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
  },
});
