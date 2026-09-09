import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

const DURACAO_MS = 1500;

interface TaskCompletedOverlayProps {
  visible: boolean;
  mensagem: string;
  onHide: () => void;
}

export function TaskCompletedOverlay({
  visible,
  mensagem,
  onHide,
}: TaskCompletedOverlayProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }
    const temporizador = setTimeout(onHide, DURACAO_MS);
    return () => clearTimeout(temporizador);
  }, [visible, onHide]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.cartao}>
        <Text style={styles.check}>✓</Text>
        <Text style={styles.mensagem}>{mensagem}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartao: {
    backgroundColor: theme.colors.terraEscura,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    maxWidth: '80%',
  },
  check: {
    fontSize: theme.typography.fontSize.xxl,
    color: theme.colors.musgoClaro,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  mensagem: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.areia,
    textAlign: 'center',
  },
});
