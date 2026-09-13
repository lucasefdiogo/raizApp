import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';

interface OnboardingStepPrimeiraTarefaProps {
  valor: string;
  onAlterar: (titulo: string) => void;
}

/**
 * Último passo do onboarding (03-mvp.md / fundamentação teórica 10.3 —
 * tarefa fatiada até o ponto de aceitação sustenta o momentum): gera a
 * primeira evidência de capacidade antes da Home, não só um formulário
 * respondido. Componente burro, mesmo padrão dos outros passos (só
 * título + campo) — os botões "Começar"/"Pular por hoje" vivem no rodapé
 * do OnboardingScreen, como os demais passos.
 */
export function OnboardingStepPrimeiraTarefa({
  valor,
  onAlterar,
}: OnboardingStepPrimeiraTarefaProps) {
  return (
    <View>
      <Text style={styles.titulo}>Vamos começar pequeno de propósito.</Text>
      <Text style={styles.descricao}>
        Escolha 1 coisa simples que você consegue terminar hoje em menos de
        10 minutos.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="ex: separar a roupa de treino"
        placeholderTextColor={theme.colors.textSecondary}
        value={valor}
        onChangeText={onAlterar}
        accessibilityLabel="Sua primeira tarefa"
        returnKeyType="done"
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
});
