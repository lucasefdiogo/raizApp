import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Tarefa } from '../../domain/types';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface TarefasExtrasScreenProps {
  /** Tarefas extras pendentes do dia (não essenciais, sem tarefaPaiId). */
  tarefas: Tarefa[];
  blocoPorTarefaExtra: number;
  onConcluir: (tarefaId: string) => void;
  onAdicionar: (titulo: string) => void;
  onVoltar: () => void;
}

/** Lista de tarefas extras do dia a partir do bloqueio: concluir uma rende bloco; dá também pra criar uma pequena. */
export function TarefasExtrasScreen({
  tarefas,
  blocoPorTarefaExtra,
  onConcluir,
  onAdicionar,
  onVoltar,
}: TarefasExtrasScreenProps) {
  const [rascunho, setRascunho] = useState('');

  function handleAdicionar() {
    const titulo = rascunho.trim();
    if (titulo.length === 0) {
      return;
    }
    onAdicionar(titulo);
    setRascunho('');
  }

  const recompensa =
    blocoPorTarefaExtra === 1 ? '1 bloco' : `${blocoPorTarefaExtra} blocos`;

  return (
    <ScrollView
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      testID="tarefas-extras"
    >
      <Text style={styles.titulo}>Tarefas extras</Text>
      <Text style={styles.apoio}>Cada uma concluída rende {recompensa}.</Text>

      {tarefas.length === 0 ? (
        <Text style={styles.apoio}>
          Nenhuma tarefa extra por aqui. Escreva uma coisa pequena abaixo.
        </Text>
      ) : (
        tarefas.map(tarefa => (
          <View key={tarefa.id} style={styles.item}>
            <Text style={styles.tituloTarefa}>{tarefa.titulo}</Text>
            <SecondaryButton
              titulo={`Concluir: ${tarefa.titulo}`}
              onPress={() => onConcluir(tarefa.id)}
            />
          </View>
        ))
      )}

      <TextField
        label="Nova tarefa extra"
        value={rascunho}
        onChangeText={setRascunho}
        returnKeyType="done"
        onSubmitEditing={handleAdicionar}
      />
      <PrimaryButton
        titulo="Adicionar"
        onPress={handleAdicionar}
        desabilitado={rascunho.trim().length === 0}
      />
      <SecondaryButton titulo="Voltar" onPress={onVoltar} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  apoio: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  item: {
    gap: theme.spacing.sm,
  },
  tituloTarefa: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
