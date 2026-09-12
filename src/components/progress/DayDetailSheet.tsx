import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { StatusHistoricoDia } from '../../domain/progress';
import { Tarefa } from '../../domain/types';

interface DayDetailSheetProps {
  visible: boolean;
  /** Ex: "Quarta-feira". */
  label: string;
  status: StatusHistoricoDia;
  tarefas: Tarefa[];
  onClose: () => void;
}

const LABEL_STATUS: Record<StatusHistoricoDia, string> = {
  cumprido: 'cumprido',
  protegido_escudo: 'protegido pelo escudo',
  perdido: 'perdido',
  pendente: 'pendente',
  sem_registro: 'sem registro',
};

/**
 * Detalhe read-only de um dia do histórico (ver ProgressoScreen) — mostra as
 * tarefas daquele dailyLog exatamente como ficaram, sem nenhum toggle
 * funcional (nem accessibilityRole="checkbox", pra não sugerir que dá pra
 * interagir). Componente burro: quem busca os dados é useDayDetail.
 */
export function DayDetailSheet({
  visible,
  label,
  status,
  tarefas,
  onClose,
}: DayDetailSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.fundo} onPress={onClose}>
        {/* trava a propagação do toque no cartão pro fundo não fechar */}
        <Pressable
          style={[
            styles.cartao,
            { paddingBottom: theme.spacing.xl + insets.bottom },
          ]}
          onPress={() => {}}
        >
          <Text style={styles.titulo}>
            {label} · {LABEL_STATUS[status]}
          </Text>

          {tarefas.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma tarefa registrada nesse dia.</Text>
          ) : (
            <View style={styles.lista}>
              {tarefas.map(tarefa => (
                <View key={tarefa.id} style={styles.linha}>
                  <View
                    testID="day-detail-checkbox"
                    accessibilityLabel={
                      tarefa.concluida ? 'concluída' : 'não concluída'
                    }
                    style={[
                      styles.checkbox,
                      tarefa.concluida && styles.checkboxMarcado,
                    ]}
                  />
                  <Text
                    style={[
                      styles.tarefaTitulo,
                      tarefa.concluida && styles.tarefaTituloConcluida,
                    ]}
                  >
                    {tarefa.titulo}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.fechar}
          >
            <Text style={styles.fecharTexto}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  cartao: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  titulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  vazio: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  lista: {
    gap: theme.spacing.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  checkboxMarcado: {
    backgroundColor: theme.colors.musgo,
  },
  tarefaTitulo: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  tarefaTituloConcluida: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  fechar: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  fecharTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
