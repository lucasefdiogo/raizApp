import React from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LifeBuoy, Pencil, Trash } from 'lucide-react-native';
import { theme } from '../../theme';

interface TaskActionsSheetProps {
  visible: boolean;
  tituloTarefa: string;
  /**
   * Ausente = a linha "Estou travado" não aparece — hoje isso só acontece
   * quando a tarefa já está concluída (ver TaskItem), já que o TravadoFlow
   * não faz sentido pra algo que já foi feito.
   */
  onEstouTravado?: () => void;
  /** Ausente = a linha "Editar" não aparece. */
  onEditar?: () => void;
  /** Ausente = a linha "Excluir" não aparece. */
  onExcluir?: () => void;
  onCancelar: () => void;
}

/**
 * Folha de ações que abre no long-press de uma tarefa. Componente burro: só
 * oferece Estou travado / Editar / Excluir / Cancelar. "Excluir" aqui já é a
 * confirmação — o long-press é deliberado o bastante, não precisa de um
 * segundo diálogo. "Estou travado" é uma das 3 entradas do TravadoFlow (ver
 * spec 09-ponte-fuga-tarefa, seção 2) — vem primeiro porque é a ação mais
 * "no calor da hora" das quatro.
 */
export function TaskActionsSheet({
  visible,
  tituloTarefa,
  onEstouTravado,
  onEditar,
  onExcluir,
  onCancelar,
}: TaskActionsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancelar}
    >
      <Pressable style={styles.fundo} onPress={onCancelar}>
        {/* trava a propagação do toque no cartão pro fundo não fechar */}
        <Pressable
          style={[
            styles.cartao,
            { paddingBottom: theme.spacing.xl + insets.bottom },
          ]}
          onPress={() => {}}
        >
          <Text style={styles.titulo} numberOfLines={1}>
            {tituloTarefa}
          </Text>

          {onEstouTravado && (
            <Pressable
              accessibilityRole="button"
              onPress={onEstouTravado}
              style={styles.acao}
            >
              <LifeBuoy size={18} color={theme.colors.textPrimary} />
              <Text style={styles.acaoTexto}>Estou travado</Text>
            </Pressable>
          )}

          {onEditar && (
            <Pressable
              accessibilityRole="button"
              onPress={onEditar}
              style={styles.acao}
            >
              <Pencil size={18} color={theme.colors.textPrimary} />
              <Text style={styles.acaoTexto}>Editar</Text>
            </Pressable>
          )}

          {onExcluir && (
            <Pressable
              accessibilityRole="button"
              onPress={onExcluir}
              style={styles.acao}
            >
              <Trash size={18} color={theme.colors.erro} />
              <Text style={[styles.acaoTexto, styles.acaoTextoExcluir]}>
                Excluir
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onCancelar}
            style={styles.cancelar}
          >
            <Text style={styles.cancelarTexto}>Cancelar</Text>
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
    // paddingBottom vem inline (theme.spacing.xl + insets.bottom) — a
    // barra de gestos do Android some por cima do botão "Cancelar" sem
    // isso, em vez de só um respiro fixo.
    gap: theme.spacing.xs,
  },
  titulo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  acaoTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  acaoTextoExcluir: {
    color: theme.colors.erro,
  },
  cancelar: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelarTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
});
