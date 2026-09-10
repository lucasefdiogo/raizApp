import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField } from '../TextField';
import { TipoTarefa } from '../../domain/types';

interface TaskTypeToggleProps {
  tipo: TipoTarefa;
  duracaoMinutos: number | null;
  onChangeTipo: (tipo: TipoTarefa) => void;
  onChangeDuracao: (minutos: number | null) => void;
}

/**
 * Marca a tarefa que está sendo criada como exercício e, só nesse caso,
 * revela o campo de duração em minutos. Componente burro: não valida nem
 * grava nada, só levanta as mudanças.
 */
export function TaskTypeToggle({
  tipo,
  duracaoMinutos,
  onChangeTipo,
  onChangeDuracao,
}: TaskTypeToggleProps) {
  const ehExercicio = tipo === 'exercicio';

  function alternar() {
    if (ehExercicio) {
      onChangeTipo('padrao');
      onChangeDuracao(null);
    } else {
      onChangeTipo('exercicio');
    }
  }

  function aoDigitarDuracao(texto: string) {
    const digitos = texto.replace(/[^0-9]/g, '');
    onChangeDuracao(digitos === '' ? null : Number(digitos));
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ehExercicio }}
        onPress={alternar}
        style={styles.linha}
      >
        <View style={[styles.checkbox, ehExercicio && styles.checkboxMarcado]} />
        <Text style={styles.rotulo}>Isso é exercício?</Text>
      </Pressable>

      {ehExercicio && (
        <TextField
          label="Duração (min)"
          placeholder="ex: 20"
          keyboardType="number-pad"
          value={duracaoMinutos === null ? '' : String(duracaoMinutos)}
          onChangeText={aoDigitarDuracao}
          returnKeyType="done"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
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
  rotulo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
});
