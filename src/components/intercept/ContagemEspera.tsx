import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

interface ContagemEsperaProps {
  /** Já formatado por quem chama ("32 min", "0:05") — RN10/RN09. */
  texto: string;
  accessibilityLabel: string;
}

/**
 * Número grande da espera, reusado pelo cooldown (RN10) e pela espera do
 * acesso rápido (RN09). Contagens em Terra Escura (RN16). Região viva pra o
 * leitor de tela acompanhar sem precisar tocar em nada.
 */
export function ContagemEspera({ texto, accessibilityLabel }: ContagemEsperaProps) {
  return (
    <Text
      testID="contagem-espera"
      style={styles.contagem}
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      {texto}
    </Text>
  );
}

const styles = StyleSheet.create({
  contagem: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
