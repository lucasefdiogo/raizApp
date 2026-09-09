import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
interface StreakCardProps {
  streak: {
    streakAtual: number;
    escudosDisponiveis: number;
  };
}

export function StreakCard({ streak }: StreakCardProps) {
  const rotuloDias = streak.streakAtual === 1 ? 'dia seguido' : 'dias seguidos';

  return (
    <View style={styles.card}>
      <Text style={styles.valor}>{streak.streakAtual}</Text>
      <Text style={styles.rotulo}>{rotuloDias}</Text>
      <View style={styles.rodape}>
        <Text style={styles.escudos}>
          {streak.escudosDisponiveis}{' '}
          {streak.escudosDisponiveis === 1 ? 'escudo disponível' : 'escudos disponíveis'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.terraEscura,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  valor: {
    fontSize: theme.typography.fontSize.xxl * 1.5,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.areia,
  },
  rotulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.areia,
    marginBottom: theme.spacing.md,
  },
  rodape: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.terraEscura2,
    paddingTop: theme.spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  escudos: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.cobreClaro,
  },
});
