import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

// Aproximação da altura da bottom tab bar do MainTabNavigator. O toast
// senta acima dela quando ela existe; nas telas sem abas (auth/onboarding)
// fica um pouco alto demais, o que é aceitável pra um aviso de 3s.
const ALTURA_TAB_BAR = 56;

interface ToastProps {
  mensagem: string;
  onFechar: () => void;
}

/**
 * Barra fina no rodapé — aviso passageiro de que uma ação não foi salva.
 * Componente burro: recebe a mensagem e o callback de fechar por prop, não
 * sabe de fila nem de cronômetro (isso é do ToastProvider).
 */
export function Toast({ mensagem, onFechar }: ToastProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      testID="toast"
      accessibilityRole="alert"
      accessibilityLabel={mensagem}
      onPress={onFechar}
      style={[styles.container, { bottom: insets.bottom + ALTURA_TAB_BAR }]}
    >
      <Text style={styles.texto}>{mensagem}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.terraEscura,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  texto: {
    color: theme.colors.areia,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    textAlign: 'center',
  },
});
