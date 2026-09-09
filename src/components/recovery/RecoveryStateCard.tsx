import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { RootProgressIcon } from '../RootProgressIcon';

interface RecoveryStateCardProps {
  tipo: 'escudo' | 'reduzido';
  corpo: string;
}

const EYEBROW: Record<RecoveryStateCardProps['tipo'], string> = {
  escudo: 'Escudo ativado',
  reduzido: 'Streak reduzido',
};

export function RecoveryStateCard({ tipo, corpo }: RecoveryStateCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{EYEBROW[tipo]}</Text>
      <RootProgressIcon variant={tipo} tamanho={112} />
      <Text style={styles.corpo}>{corpo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
