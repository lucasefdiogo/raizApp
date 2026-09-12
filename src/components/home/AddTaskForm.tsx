import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField } from '../TextField';
import { PrimaryButton } from '../PrimaryButton';
import { TaskTypeToggle } from './TaskTypeToggle';
import { MENSAGEM_LIMITE_ESSENCIAIS } from '../../domain/dailyTasks';
import { TipoTarefa } from '../../domain/types';

interface AddTaskFormProps {
  onAdicionar: (
    titulo: string,
    essencial: boolean,
    tipo: TipoTarefa,
    duracaoMinutos?: number,
    repetirTodosOsDias?: boolean,
  ) => void;
  limiteEssenciaisAtingido: boolean;
}

export function AddTaskForm({
  onAdicionar,
  limiteEssenciaisAtingido,
}: AddTaskFormProps) {
  const [titulo, setTitulo] = useState('');
  const [essencial, setEssencial] = useState(false);
  const [tipo, setTipo] = useState<TipoTarefa>('padrao');
  const [duracaoMinutos, setDuracaoMinutos] = useState<number | null>(null);
  const [repetirTodosOsDias, setRepetirTodosOsDias] = useState(false);

  const podeMarcarEssencial = !limiteEssenciaisAtingido;
  const essencialEfetivo = essencial && podeMarcarEssencial;
  const tituloLimpo = titulo.trim();

  function adicionar() {
    if (tituloLimpo.length === 0) {
      return;
    }
    onAdicionar(
      tituloLimpo,
      essencialEfetivo,
      tipo,
      tipo === 'exercicio' && duracaoMinutos !== null
        ? duracaoMinutos
        : undefined,
      repetirTodosOsDias,
    );
    setTitulo('');
    setEssencial(false);
    setTipo('padrao');
    setDuracaoMinutos(null);
    setRepetirTodosOsDias(false);
  }

  return (
    <View style={styles.container}>
      <TextField
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

      <TaskTypeToggle
        tipo={tipo}
        duracaoMinutos={duracaoMinutos}
        onChangeTipo={setTipo}
        onChangeDuracao={setDuracaoMinutos}
      />

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: repetirTodosOsDias }}
        onPress={() => setRepetirTodosOsDias(atual => !atual)}
        style={styles.linhaRepetir}
      >
        <Text style={styles.rotuloRepetir}>Repetir todos os dias</Text>
        <View style={[styles.trilha, repetirTodosOsDias && styles.trilhaAtiva]}>
          <View
            style={[styles.bolinha, repetirTodosOsDias && styles.bolinhaAtiva]}
          />
        </View>
      </Pressable>

      <PrimaryButton
        titulo="Adicionar tarefa"
        onPress={adicionar}
        desabilitado={tituloLimpo.length === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  linhaEssencial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
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
  linhaRepetir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  rotuloRepetir: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  // Toggle customizado (não o <Switch> nativo) — ver
  // reference_switch_loadingindicator_flatlist_jest na memória do projeto:
  // Switch quebra em testes que rodam depois de um LoadingIndicator no
  // mesmo arquivo, gatilho mais amplo do que só "dentro de FlatList".
  trilha: {
    width: 44,
    height: 26,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  trilhaAtiva: {
    backgroundColor: theme.colors.cobre,
  },
  bolinha: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.branco,
  },
  bolinhaAtiva: {
    alignSelf: 'flex-end',
  },
});
