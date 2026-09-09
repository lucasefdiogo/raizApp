import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useStreak } from '../hooks/useStreak';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { StreakCard } from '../components/StreakCard';
import { TaskList } from '../components/TaskList';
import { TaskCompletedOverlay } from '../components/home/TaskCompletedOverlay';
import { StatusDia } from '../domain/types';
import { obterMensagemTarefaConcluida } from '../utils/taskFeedbackMessages';

const MENSAGEM_STATUS_DIA: Record<StatusDia, string> = {
  pendente: 'O dia ainda está começando.',
  cumprido: 'Dia cumprido. Isso já conta.',
  nao_cumprido: 'Ainda dá tempo de fazer valer o dia.',
};

interface HomeScreenProps {
  uid: string;
}

export function HomeScreen({ uid }: HomeScreenProps) {
  const { streakAtual, escudosDisponiveis } = useStreak(uid);
  const { tarefas, alternarTarefa, statusDia } = useDailyTasks();
  const [overlayVisivel, setOverlayVisivel] = useState(false);
  const [mensagemOverlay, setMensagemOverlay] = useState('');

  const handleAlternarTarefa = useCallback(
    (id: string) => {
      const tarefa = tarefas.find(item => item.id === id);
      const vaiConcluir = tarefa !== undefined && !tarefa.concluida;

      alternarTarefa(id);

      if (vaiConcluir) {
        setMensagemOverlay(obterMensagemTarefaConcluida());
        setOverlayVisivel(true);
      }
    },
    [tarefas, alternarTarefa],
  );

  const esconderOverlay = useCallback(() => setOverlayVisivel(false), []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <StreakCard streak={{ streakAtual, escudosDisponiveis }} />
        <Text style={styles.secaoTitulo}>Tarefas de hoje</Text>
        <Text style={styles.statusDia}>{MENSAGEM_STATUS_DIA[statusDia]}</Text>
        <TaskList tarefas={tarefas} onAlternar={handleAlternarTarefa} />
      </ScrollView>
      <TaskCompletedOverlay
        visible={overlayVisivel}
        mensagem={mensagemOverlay}
        onHide={esconderOverlay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  conteudo: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  secaoTitulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  statusDia: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
