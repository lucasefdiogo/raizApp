import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { StatusHistoricoDia } from '../../domain/progress';

interface DayStatusPillProps {
  status: StatusHistoricoDia;
  label: string;
}

/**
 * Cobre = único status com cor de destaque (o "ponto de presente", hoje).
 * 'perdido' usa a mesma cor neutra de 'sem_registro', só sem a translucidez
 * — nada nesse produto usa vermelho de alerta (recaída sem vergonha).
 */
const APARENCIA: Record<StatusHistoricoDia, { cor: string; opacidade: number }> = {
  cumprido: { cor: theme.colors.musgo, opacidade: 1 },
  protegido_escudo: { cor: theme.colors.musgo, opacidade: 0.5 },
  perdido: { cor: theme.colors.border, opacidade: 1 },
  pendente: { cor: theme.colors.cobre, opacidade: 1 },
  sem_registro: { cor: theme.colors.border, opacidade: 0.35 },
};

export function DayStatusPill({ status, label }: DayStatusPillProps) {
  const aparencia = APARENCIA[status];

  return (
    <View style={styles.container}>
      <View
        testID="day-status-pill-indicador"
        style={[
          styles.indicador,
          { backgroundColor: aparencia.cor, opacity: aparencia.opacidade },
        ]}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  indicador: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
