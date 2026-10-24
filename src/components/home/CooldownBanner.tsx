import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface CooldownBannerProps {
  minutosRestantes: number;
}

/**
 * Card de cooldown no topo da Home (HU-14, RN05) — só a contagem em
 * minutos, sem nome de app nem qualquer outro dado pessoal (RN10). A Home
 * decide quando renderizar (useCooldownRestante devolve null fora de
 * COOLDOWN), igual ao padrão já usado ali pra LoadingIndicator/EmptyState.
 */
export function CooldownBanner({ minutosRestantes }: CooldownBannerProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{`Próxima sessão em ${minutosRestantes} min`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.areia,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.terraEscura,
  },
});
