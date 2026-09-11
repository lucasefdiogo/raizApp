import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface HomeHeaderProps {
  /** users/{uid}.nome — vazio ('') quando o usuário nunca preencheu. */
  nome: string;
  streakAtual: number;
}

function saudacaoPeloHorario(hora: number): string {
  if (hora < 12) {
    return 'Bom dia';
  }
  if (hora < 18) {
    return 'Boa tarde';
  }
  return 'Boa noite';
}

/**
 * Cabeçalho da Home: saudação (varia pelo horário do dispositivo) + badge
 * de streak, lado a lado. Componente burro — recebe nome e streakAtual já
 * resolvidos por quem chama (useNomeUsuario/useStreak), não fala com
 * Firestore. O cálculo da saudação por horário não é regra de negócio
 * sensível, é apresentação — por isso vive aqui, não em domain/.
 */
export function HomeHeader({ nome, streakAtual }: HomeHeaderProps) {
  const saudacaoBase = saudacaoPeloHorario(new Date().getHours());
  const nomeAparado = nome.trim();
  const saudacao =
    nomeAparado.length > 0 ? `${saudacaoBase}, ${nomeAparado}` : saudacaoBase;

  return (
    <View style={styles.linha}>
      <Text style={styles.saudacao}>{saudacao}</Text>
      <View
        style={styles.badge}
        accessibilityLabel={`Streak de ${streakAtual} dias`}
      >
        <Text style={styles.badgeTexto}>🌱 {streakAtual} dias</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  saudacao: {
    flexShrink: 1,
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.textPrimary,
  },
  badge: {
    backgroundColor: theme.colors.areia,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  badgeTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textPrimary,
  },
});
