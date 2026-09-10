import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

interface ConfirmDeleteAccountModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Segunda confirmação da exclusão de conta. Componente burro: não sabe o que
 * a exclusão faz, só oferece as duas saídas. "Cancelar" tem o peso visual
 * (botão cheio) porque é a escolha segura; "Excluir conta" é contido — dá o
 * peso da ação sem tom alarmista.
 */
export function ConfirmDeleteAccountModal({
  visible,
  onConfirm,
  onCancel,
}: ConfirmDeleteAccountModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.fundo}>
        <View style={styles.cartao}>
          <Text style={styles.titulo}>Excluir sua conta</Text>
          <Text style={styles.corpo}>
            Isso apaga sua conta e todo o seu progresso de forma permanente. Não
            é possível desfazer.
          </Text>

          <PrimaryButton titulo="Cancelar" onPress={onCancel} />

          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={styles.botaoExcluir}
            hitSlop={8}
          >
            <Text style={styles.textoExcluir}>Excluir conta</Text>
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
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.md * 1.5,
  },
  botaoExcluir: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  textoExcluir: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.erro,
  },
});
