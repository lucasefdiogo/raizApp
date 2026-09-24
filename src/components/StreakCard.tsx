import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { RootProgressIcon } from './RootProgressIcon';

interface StreakCardProps {
  streak: {
    streakAtual: number;
    escudosDisponiveis: number;
  };
  /**
   * Dia corrente já cumprido (calcularStatusDia(tarefas) === 'cumprido',
   * calculado pela Home a cada render) — streakAtual só incrementa de fato
   * no boot do dia seguinte (useStreak.processar() avaliando o dia
   * anterior), então mostra esse aviso em vez de fingir que o número já
   * subiu. Também soma +1 na altura visual da raiz (ver diasSequencia
   * abaixo) — sem isso, a raiz ficaria visualmente idêntica a ontem no
   * mesmo momento em que o texto diz "já garantiu hoje", uma contradição
   * visual. Ausente/false: não mostra o aviso nem o +1 de altura.
   */
  hojeCumprido?: boolean;
}

export function StreakCard({ streak, hojeCumprido = false }: StreakCardProps) {
  const rotuloDias = streak.streakAtual === 1 ? 'dia seguido' : 'dias seguidos';
  const diasSequenciaVisivel = streak.streakAtual + (hojeCumprido ? 1 : 0);

  return (
    <View style={styles.card}>
      <View style={styles.icone}>
        <RootProgressIcon
          variant="completo"
          tamanho={64}
          diasSequencia={diasSequenciaVisivel}
        />
      </View>
      <Text style={styles.valor}>{streak.streakAtual}</Text>
      <Text style={styles.rotulo}>{rotuloDias}</Text>
      {hojeCumprido && (
        <Text style={styles.hojeCumprido} testID="streak-card-hoje-cumprido">
          Já garantiu hoje.
        </Text>
      )}
      <View style={styles.rodape}>
        <Text style={styles.escudos}>
          {streak.escudosDisponiveis}{' '}
          {streak.escudosDisponiveis === 1 ? 'proteção disponível' : 'proteções disponíveis'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.terraEscura,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  icone: {
    marginBottom: theme.spacing.sm,
  },
  valor: {
    fontSize: theme.typography.fontSize.xxl * 1.5,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.areia,
  },
  rotulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.areia,
    marginBottom: theme.spacing.md,
  },
  hojeCumprido: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgoClaro,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  rodape: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.terraEscura2,
    paddingTop: theme.spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  escudos: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.cobreClaro,
  },
});
