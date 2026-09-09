import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { FocoProcrastinacao } from '../../domain/types';
import { OPCOES_FOCO_PROCRASTINACAO } from '../../domain/onboarding';

interface OnboardingStepFocoProps {
  valor: FocoProcrastinacao | null;
  onSelecionar: (foco: FocoProcrastinacao) => void;
}

export function OnboardingStepFoco({
  valor,
  onSelecionar,
}: OnboardingStepFocoProps) {
  return (
    <View>
      <Text style={styles.titulo}>Onde a procrastinação mais aparece</Text>
      <Text style={styles.descricao}>
        Escolha a área que mais pesa para você hoje.
      </Text>
      <View style={styles.opcoes}>
        {OPCOES_FOCO_PROCRASTINACAO.map(opcao => {
          const selecionado = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionado }}
              onPress={() => onSelecionar(opcao.valor)}
              style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
            >
              <Text
                style={[
                  styles.opcaoTexto,
                  selecionado && styles.opcaoTextoSelecionado,
                ]}
              >
                {opcao.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  opcoes: {
    gap: theme.spacing.sm,
  },
  opcao: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  opcaoSelecionada: {
    borderColor: theme.colors.cobre,
    backgroundColor: theme.colors.cobreClaro,
  },
  opcaoTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  opcaoTextoSelecionado: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
});
