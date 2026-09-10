import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../theme';
import { Tarefa } from '../domain/types';

interface TaskItemProps {
  tarefa: Tarefa;
  onAlternar: (id: string) => void;
  onEditar?: (id: string, titulo: string) => void;
  onRemover?: (id: string) => void;
}

export function TaskItem({
  tarefa,
  onAlternar,
  onEditar,
  onRemover,
}: TaskItemProps) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(tarefa.titulo);

  function abrirEdicao() {
    setRascunho(tarefa.titulo);
    setEditando(true);
  }

  function salvar() {
    onEditar?.(tarefa.id, rascunho);
    setEditando(false);
  }

  if (editando) {
    return (
      <View style={styles.linha}>
        <TextInput
          style={styles.input}
          value={rascunho}
          onChangeText={setRascunho}
          onSubmitEditing={salvar}
          autoFocus
          returnKeyType="done"
          accessibilityLabel="Editar tarefa"
        />
        <Pressable accessibilityRole="button" onPress={salvar} hitSlop={8}>
          <Text style={styles.acao}>salvar</Text>
        </Pressable>
      </View>
    );
  }

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
      {onEditar && (
        <Pressable accessibilityRole="button" onPress={abrirEdicao} hitSlop={8}>
          <Text style={styles.acao}>editar</Text>
        </Pressable>
      )}
      {onRemover && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onRemover(tarefa.id)}
          hitSlop={8}
        >
          <Text style={styles.acaoRemover}>remover</Text>
        </Pressable>
      )}
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
  acao: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
  },
  acaoRemover: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
});
