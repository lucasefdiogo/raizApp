import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useStreakMilestone } from '../hooks/useStreakMilestone';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { StreakCard } from '../components/StreakCard';
import { TaskList } from '../components/TaskList';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { EmptyState } from '../components/common/EmptyState';
import { AddTaskForm } from '../components/home/AddTaskForm';
import { TaskCompletedOverlay } from '../components/home/TaskCompletedOverlay';
import { StreakMilestoneModal } from '../components/home/StreakMilestoneModal';
import { StatusDia } from '../domain/types';
import { existeEssencialConcluida } from '../domain/streak';
import { obterMensagemTarefaConcluida } from '../utils/taskFeedbackMessages';

// Espera curta antes de rolar até o campo "Nova tarefa": dá tempo do teclado
// terminar de subir (e o ScrollView encolher com o adjustResize do Android),
// senão o scrollToEnd mira numa altura que muda logo em seguida.
const ATRASO_SCROLL_TECLADO_MS = 250;

const MENSAGEM_STATUS_DIA: Record<StatusDia, string> = {
  pendente: 'O dia ainda está começando.',
  cumprido: 'Dia cumprido. Isso já conta.',
  nao_cumprido: 'Ainda dá tempo de fazer valer o dia.',
};

interface HomeScreenProps {
  uid: string;
  streakAtual: number;
  escudosDisponiveis: number;
  marcoAtingido: number | null;
  avaliarAlertaRisco: (essencialConcluidaHoje: boolean) => void;
  /**
   * Releitura do streak sob demanda — o useStreak vive no HojeStack, então o
   * pull-to-refresh da Home recebe a função de lá pra atualizar o badge de
   * streak no mesmo gesto que atualiza as tarefas.
   */
  recarregarStreak: () => Promise<void>;
}

export function HomeScreen({
  uid,
  streakAtual,
  escudosDisponiveis,
  marcoAtingido,
  avaliarAlertaRisco,
  recarregarStreak,
}: HomeScreenProps) {
  const { marcoParaExibir, corpoParaExibir, limparMarcoExibido } =
    useStreakMilestone(marcoAtingido);
  const {
    tarefas,
    alternarTarefa,
    adicionarTarefa,
    editarTarefa,
    removerTarefa,
    statusDia,
    carregando,
    limiteEssenciaisAtingido,
    recarregar,
  } = useDailyTasks(uid);
  const [overlayVisivel, setOverlayVisivel] = useState(false);
  const [mensagemOverlay, setMensagemOverlay] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    avaliarAlertaRisco(existeEssencialConcluida(tarefas));
  }, [tarefas, avaliarAlertaRisco]);

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

  const aoFocarCampoNovaTarefa = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, ATRASO_SCROLL_TECLADO_MS);
  }, []);

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      // As duas releituras já tratam a própria falha (toast) e resolvem sem
      // rejeitar — o gesto só precisa esperar as duas terminarem.
      await Promise.all([recarregar(), recarregarStreak()]);
    } finally {
      setAtualizando(false);
    }
  }, [recarregar, recarregarStreak]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        testID="home-scroll"
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            testID="home-refresh-control"
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={[theme.colors.cobre]}
            tintColor={theme.colors.cobre}
          />
        }
      >
        <StreakCard streak={{ streakAtual, escudosDisponiveis }} />
        <Text style={styles.secaoTitulo}>Tarefas de hoje</Text>
        <Text style={styles.statusDia}>{MENSAGEM_STATUS_DIA[statusDia]}</Text>
        {carregando ? (
          <LoadingIndicator variant="inline" />
        ) : (
          <>
            {tarefas.length === 0 ? (
              <EmptyState
                titulo="Nenhuma tarefa ainda"
                corpo="Adicione a primeira — pode ser bem pequena."
              />
            ) : (
              <TaskList
                tarefas={tarefas}
                onAlternar={handleAlternarTarefa}
                onEditar={(id, titulo) => editarTarefa(id, { titulo })}
                onRemover={removerTarefa}
              />
            )}
            <AddTaskForm
              onAdicionar={adicionarTarefa}
              limiteEssenciaisAtingido={limiteEssenciaisAtingido}
              onFocarCampo={aoFocarCampoNovaTarefa}
            />
          </>
        )}
      </ScrollView>
      <TaskCompletedOverlay
        visible={overlayVisivel}
        mensagem={mensagemOverlay}
        onHide={esconderOverlay}
      />
      {marcoParaExibir !== null && (
        <StreakMilestoneModal
          marco={marcoParaExibir}
          corpo={corpoParaExibir}
          visible={!overlayVisivel}
          onDismiss={limparMarcoExibido}
        />
      )}
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
