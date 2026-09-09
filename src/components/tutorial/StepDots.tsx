import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

interface StepDotsProps {
  total: number;
  atual: number;
}

export function StepDots({ total, atual }: StepDotsProps) {
  return (
    <View
      style={styles.container}
      accessibilityLabel={`Passo ${atual + 1} de ${total}`}
    >
      {Array.from({ length: total }).map((_, indice) => (
        <View
          key={indice}
          style={[styles.dot, indice === atual && styles.dotAtivo]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
  },
  dotAtivo: {
    backgroundColor: theme.colors.cobre,
    width: 20,
  },
});
