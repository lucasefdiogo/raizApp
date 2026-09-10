import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField, TextFieldRef } from '../TextField';
import { PrimaryButton } from '../PrimaryButton';
import { MENSAGEM_LIMITE_ESSENCIAIS } from '../../domain/dailyTasks';

interface AddTaskFormProps {
  onAdicionar: (titulo: string, essencial: boolean) => void;
  limiteEssenciaisAtingido: boolean;
}

export interface AddTaskFormRef {
  /** Foca o campo "Nova tarefa" — usado pelo CTA do estado vazio da Home. */
  focar: () => void;
}

export const AddTaskForm = forwardRef<AddTaskFormRef, AddTaskFormProps>(
  function AddTaskFormBase({ onAdicionar, limiteEssenciaisAtingido }, ref) {
    const campoRef = useRef<TextFieldRef>(null);
    const [titulo, setTitulo] = useState('');
    const [essencial, setEssencial] = useState(false);

    useImperativeHandle(ref, () => ({
      focar: () => campoRef.current?.focus(),
    }));

  const podeMarcarEssencial = !limiteEssenciaisAtingido;
  const essencialEfetivo = essencial && podeMarcarEssencial;
  const tituloLimpo = titulo.trim();

  function adicionar() {
    if (tituloLimpo.length === 0) {
      return;
    }
    onAdicionar(tituloLimpo, essencialEfetivo);
    setTitulo('');
    setEssencial(false);
  }

  return (
    <View style={styles.container}>
      <TextField
        ref={campoRef}
        label="Nova tarefa"
        placeholder="ex: revisar o capítulo 3"
        value={titulo}
        onChangeText={setTitulo}
        onSubmitEditing={adicionar}
        returnKeyType="done"
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: essencialEfetivo,
          disabled: !podeMarcarEssencial,
        }}
        disabled={!podeMarcarEssencial}
        onPress={() => setEssencial(atual => !atual)}
        style={styles.linhaEssencial}
      >
        <View
          style={[styles.checkbox, essencialEfetivo && styles.checkboxMarcado]}
        />
        <Text
          style={[
            styles.rotuloEssencial,
            !podeMarcarEssencial && styles.rotuloDesabilitado,
          ]}
        >
          Marcar como essencial
        </Text>
      </Pressable>

      {!podeMarcarEssencial && (
        <Text style={styles.aviso}>{MENSAGEM_LIMITE_ESSENCIAIS}</Text>
      )}

      <PrimaryButton
        titulo="Adicionar tarefa"
        onPress={adicionar}
        desabilitado={tituloLimpo.length === 0}
      />
    </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  linhaEssencial: {
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
  rotuloEssencial: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  rotuloDesabilitado: {
    color: theme.colors.textSecondary,
  },
  aviso: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
