import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tarefa } from '../domain/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tarefas: Tarefa[];
  onAlternar: (id: string) => void;
  onEditar?: (id: string, titulo: string) => void;
  onRemover?: (id: string) => void;
}

export function TaskList({
  tarefas,
  onAlternar,
  onEditar,
  onRemover,
}: TaskListProps) {
  return (
    <View style={styles.lista}>
      {tarefas.map(tarefa => (
        <TaskItem
          key={tarefa.id}
          tarefa={tarefa}
          onAlternar={onAlternar}
          onEditar={onEditar}
          onRemover={onRemover}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    width: '100%',
  },
});
