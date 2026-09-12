import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface RecurringTaskActionSheetProps {
  visible: boolean;
  onRemoverHoje: () => void;
  onPararDeRepetir: () => void;
  onCancelar: () => void;
}

/**
 * Menu de gerenciamento de uma tarefa recorrente, aberto no toque e segure
 * (ver TaskItem — só quando origemRecorrenteId está presente; tarefas
 * avulsas continuam abrindo TaskActionsSheet). Mesmo padrão visual de modal
 * centralizado do ConfirmDeleteAccountModal — não introduz um terceiro
 * padrão de modal no projeto. Componente burro: não sabe o que cada opção
 * faz de fato, só repassa o toque.
 */
export function RecurringTaskActionSheet({
  visible,
  onRemoverHoje,
  onPararDeRepetir,
  onCancelar,
}: RecurringTaskActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancelar}
    >
      <View style={styles.fundo}>
        <View style={styles.cartao}>
          <Text style={styles.titulo}>Tarefa recorrente</Text>
          <Text style={styles.corpo}>Essa tarefa se repete todos os dias.</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onRemoverHoje}
            style={styles.opcao}
          >
            <Text style={styles.opcaoTexto}>Remover só hoje</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onPararDeRepetir}
            style={styles.opcao}
          >
            <Text style={styles.opcaoTexto}>Parar de repetir</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onCancelar}
            style={styles.opcao}
          >
            <Text style={styles.cancelarTexto}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  cartao: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  titulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  corpo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  opcao: {
    paddingVertical: theme.spacing.md,
  },
  opcaoTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  cancelarTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
