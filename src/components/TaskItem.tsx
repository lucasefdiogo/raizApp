import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Tarefa } from '../domain/types';

interface TaskItemProps {
  tarefa: Tarefa;
  onAlternar: (id: string) => void;
}

export function TaskItem({ tarefa, onAlternar }: TaskItemProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: tarefa.concluida }}
      onPress={() => onAlternar(tarefa.id)}
      style={styles.linha}
    >
      <View style={[styles.checkbox, tarefa.concluida && styles.checkboxMarcado]} />
      <Text
        style={[styles.titulo, tarefa.concluida && styles.tituloConcluido]}
      >
        {tarefa.titulo}
      </Text>
      {tarefa.essencial && <Text style={styles.selo}>essencial</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  checkboxMarcado: {
    backgroundColor: theme.colors.musgo,
  },
  titulo: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  tituloConcluido: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  selo: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.cobre,
  },
});
