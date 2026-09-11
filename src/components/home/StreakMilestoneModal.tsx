import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { RootProgressIcon } from '../RootProgressIcon';
import { PrimaryButton } from '../PrimaryButton';

interface StreakMilestoneModalProps {
  marco: number;
  corpo: string;
  visible: boolean;
  onDismiss: () => void;
}

export function StreakMilestoneModal({
  marco,
  corpo,
  visible,
  onDismiss,
}: StreakMilestoneModalProps) {
  return (
    <Modal
      testID="streak-milestone-modal"
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.fundo}>
        <View style={styles.cartao}>
          <Text style={styles.eyebrow}>Marco atingido</Text>
          <RootProgressIcon variant="completo" tamanho={96} />
          <Text style={styles.numero}>{marco}</Text>
          <Text style={styles.legenda}>dias seguidos</Text>
          {corpo ? <Text style={styles.corpo}>{corpo}</Text> : null}
          <PrimaryButton titulo="Continuar" onPress={onDismiss} />
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
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
  },
  numero: {
    fontSize: theme.typography.fontSize.xxl * 1.5,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  legenda: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
});
