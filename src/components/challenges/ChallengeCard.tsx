import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { StatusDesafio } from '../../domain/types';

interface ChallengeCardProps {
  titulo: string;
  progresso: number;
  meta: number;
  status: StatusDesafio;
}

const MENSAGEM_STATUS: Partial<Record<StatusDesafio, string>> = {
  concluido: 'Concluído.',
  expirado: 'Essa rodada não fechou — a próxima já começou.',
};

/**
 * Card de desafio: título, barra de progresso (Musgo) e "X de Y".
 * Componente burro — não sabe de período nem de Firestore. 'expirado' fica
 * mais apagado e sem tom de cobrança (princípio 3 do CLAUDE.md).
 */
export function ChallengeCard({
  titulo,
  progresso,
  meta,
  status,
}: ChallengeCardProps) {
  const fracao = meta > 0 ? Math.max(0, Math.min(1, progresso / meta)) : 0;
  const expirado = status === 'expirado';
  const mensagem = MENSAGEM_STATUS[status];

  return (
    <View
      testID="challenge-card"
      style={[styles.container, expirado && styles.containerExpirado]}
    >
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.trilha}>
        <View
          testID="challenge-card-barra"
          style={[styles.preenchida, { width: `${fracao * 100}%` }]}
        />
      </View>

      <Text style={styles.contagem}>
        {progresso} de {meta}
      </Text>

      {mensagem && <Text style={styles.status}>{mensagem}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  containerExpirado: {
    opacity: 0.6,
  },
  titulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  trilha: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  preenchida: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.musgo,
  },
  contagem: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  status: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
