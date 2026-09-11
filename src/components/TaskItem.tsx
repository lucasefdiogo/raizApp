import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Dumbbell, Star } from 'lucide-react-native';
import { theme } from '../theme';
import { Tarefa } from '../domain/types';
import { TaskActionsSheet } from './home/TaskActionsSheet';

const ATRASO_LONG_PRESS_MS = 350;

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
  const [menuAberto, setMenuAberto] = useState(false);
  const [rascunho, setRascunho] = useState(tarefa.titulo);

  const temAcoes = onEditar !== undefined || onRemover !== undefined;

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
        <Pressable
          accessibilityRole="button"
          onPress={salvar}
          hitSlop={8}
          style={styles.acaoToque}
        >
          <Text style={styles.acao}>salvar</Text>
        </Pressable>
      </View>
    );
  }

  const ehExercicio = tarefa.tipo === 'exercicio';

  return (
    <>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tarefa.concluida }}
        accessibilityHint={
          temAcoes ? 'Toque e segure para editar ou excluir' : undefined
        }
        onPress={() => onAlternar(tarefa.id)}
        onLongPress={temAcoes ? () => setMenuAberto(true) : undefined}
        delayLongPress={ATRASO_LONG_PRESS_MS}
        style={styles.linha}
      >
        <View
          style={[styles.checkbox, tarefa.concluida && styles.checkboxMarcado]}
        />
        <View style={styles.tituloArea}>
          <Text
            style={[styles.titulo, tarefa.concluida && styles.tituloConcluido]}
          >
            {tarefa.titulo}
          </Text>
          {ehExercicio && tarefa.duracaoMinutos != null && (
            <Text style={styles.duracao}>{tarefa.duracaoMinutos} min</Text>
          )}
        </View>
        <View style={styles.selos}>
          {ehExercicio && (
            <View
              testID="task-item-exercicio-icone"
              accessibilityLabel="exercício"
            >
              <Dumbbell size={16} color={theme.colors.musgo} />
            </View>
          )}
          {tarefa.essencial && (
            <View accessibilityLabel="essencial">
              <Star
                size={14}
                color={theme.colors.textSecondary}
                fill={theme.colors.textSecondary}
              />
            </View>
          )}
        </View>
      </Pressable>

      <TaskActionsSheet
        visible={menuAberto}
        tituloTarefa={tarefa.titulo}
        onEditar={
          onEditar
            ? () => {
                setMenuAberto(false);
                abrirEdicao();
              }
            : undefined
        }
        onExcluir={
          onRemover
            ? () => {
                setMenuAberto(false);
                onRemover(tarefa.id);
              }
            : undefined
        }
        onCancelar={() => setMenuAberto(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
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
  tituloArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
  },
  selos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  titulo: {
    flexShrink: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  tituloConcluido: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  duracao: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  acaoToque: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  acao: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
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
