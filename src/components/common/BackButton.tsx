import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { theme } from '../../theme';

interface BackButtonProps {
  onPress: () => void;
}

/**
 * Chevron de voltar — só em telas empurradas numa stack (SignUp,
 * ForgotPassword, AppBlockConfigScreen), nunca em raiz de aba. Alvo de
 * toque de 40px + hitSlop de 12 em cada lado (>48dp), pra não repetir o
 * padrão de link de texto sem área de toque suficiente já corrigido em
 * outras telas.
 */
export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      onPress={onPress}
      hitSlop={12}
      style={styles.botao}
    >
      <ChevronLeft size={22} color={theme.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
