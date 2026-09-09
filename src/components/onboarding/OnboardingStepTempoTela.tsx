import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface OnboardingStepTempoTelaProps {
  valor: number | null;
  onSelecionar: (horas: number) => void;
}

const OPCOES_HORAS = [1, 2, 3, 4, 5, 6];

export function OnboardingStepTempoTela({
  valor,
  onSelecionar,
}: OnboardingStepTempoTelaProps) {
  return (
    <View>
      <Text style={styles.titulo}>Quanto tempo de tela por dia, hoje</Text>
      <Text style={styles.descricao}>
        Uma estimativa já ajuda — sem precisão, é só um ponto de partida.
      </Text>
      <View style={styles.opcoes}>
        {OPCOES_HORAS.map(horas => {
          const selecionado = horas === valor;
          return (
            <Pressable
              key={horas}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionado }}
              onPress={() => onSelecionar(horas)}
              style={[styles.chip, selecionado && styles.chipSelecionado]}
            >
              <Text
                style={[
                  styles.chipTexto,
                  selecionado && styles.chipTextoSelecionado,
                ]}
              >
                {horas === 6 ? '6h ou mais' : `${horas}h`}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  chipSelecionado: {
    borderColor: theme.colors.cobre,
    backgroundColor: theme.colors.cobreClaro,
  },
  chipTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  chipTextoSelecionado: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
});
