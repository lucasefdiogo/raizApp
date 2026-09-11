import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useStreakMilestone } from '../hooks/useStreakMilestone';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { useAppBlockConfig } from '../hooks/useAppBlockConfig';
import { useAppBlockBannerDismissido } from '../hooks/useAppBlockBannerDismissido';
import { useRecarregarAoFocar } from '../hooks/useRecarregarAoFocar';
import { StreakCard } from '../components/StreakCard';
import { TaskList } from '../components/TaskList';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { EmptyState } from '../components/common/EmptyState';
import { AddTaskForm } from '../components/home/AddTaskForm';
import { TaskCompletedOverlay } from '../components/home/TaskCompletedOverlay';
import { StreakMilestoneModal } from '../components/home/StreakMilestoneModal';
import { AppBlockBanner } from '../components/home/AppBlockBanner';
import { AppBlockStatusCard } from '../components/home/AppBlockStatusCard';
import { StatusDia } from '../domain/types';
import { existeEssencialConcluida } from '../domain/streak';
import { obterMensagemTarefaConcluida } from '../utils/taskFeedbackMessages';

// No Android com edge-to-edge (RN 0.81+) o `adjustResize` não encolhe mais a
// janela — o teclado entra por cima. Então acompanhamos a altura do teclado à
// mão, criamos espaço equivalente no fim do ScrollView e rolamos até lá pra o
// campo "Nova tarefa" ficar acima do teclado.
const ATRASO_SCROLL_TECLADO_MS = 50;

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
  /** Abre a tela de configuração do bloqueio de apps, já existente (Perfil
   * também linka pra ela — não é uma tela duplicada). */
  aoAbrirBloqueioApps: () => void;
}

export function HomeScreen({
  uid,
  streakAtual,
  escudosDisponiveis,
  marcoAtingido,
  avaliarAlertaRisco,
  recarregarStreak,
  aoAbrirBloqueioApps,
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
  const {
    appsInstalados,
    configAtual: bloqueioApps,
    ativoAgora: bloqueioAtivoAgora,
    carregando: bloqueioCarregando,
    recarregar: recarregarBloqueioApps,
  } = useAppBlockConfig(uid);
  const banner = useAppBlockBannerDismissido();
  // A Home não desmonta quando empurra a AppBlockConfigScreen na mesma
  // stack (HojeStack) — só perde o foco. Sem isso, editar a config lá e
  // voltar mostrava o banner/status card com dados obsoletos.
  useRecarregarAoFocar(recarregarBloqueioApps);
  const [overlayVisivel, setOverlayVisivel] = useState(false);
  const [mensagemOverlay, setMensagemOverlay] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    avaliarAlertaRisco(existeEssencialConcluida(tarefas));
  }, [tarefas, avaliarAlertaRisco]);

  useEffect(() => {
    const aoMostrar = Keyboard.addListener('keyboardDidShow', evento => {
      setAlturaTeclado(evento.endCoordinates.height);
    });
    const aoEsconder = Keyboard.addListener('keyboardDidHide', () => {
      setAlturaTeclado(0);
    });
    return () => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, []);

  // Depois que o espaço extra entra no fim da lista, rola até o campo.
  useEffect(() => {
    if (alturaTeclado === 0) {
      return;
    }
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, ATRASO_SCROLL_TECLADO_MS);
    return () => clearTimeout(id);
  }, [alturaTeclado]);

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

  // Mutuamente exclusivos por construção: length === 0 e length > 0 nunca
  // são verdadeiros ao mesmo tempo. Os dois só aparecem depois que
  // useAppBlockConfig resolve, pra não piscar o banner antes de saber se
  // já existe config salva.
  const mostrarBannerBloqueio =
    !bloqueioCarregando &&
    !banner.carregando &&
    bloqueioApps.appsSelecionados.length === 0 &&
    !banner.dispensadoHoje;
  const mostrarStatusBloqueio =
    !bloqueioCarregando && bloqueioApps.appsSelecionados.length > 0;

  const appsBloqueadosResolvidos = bloqueioApps.appsSelecionados
    .map(pacote => appsInstalados.find(app => app.packageName === pacote))
    .filter((app): app is (typeof appsInstalados)[number] => app !== undefined)
    .map(app => ({ nome: app.nome, icone: app.icone }));

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
        contentContainerStyle={[
          styles.conteudo,
          alturaTeclado > 0 && {
            paddingBottom: alturaTeclado + theme.spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            testID="home-refresh-control"
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={[theme.colors.musgo]}
            tintColor={theme.colors.musgo}
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
            />
          </>
        )}

        {mostrarBannerBloqueio && (
          <AppBlockBanner
            onConfigurar={aoAbrirBloqueioApps}
            onDispensar={banner.dispensarHoje}
          />
        )}
        {mostrarStatusBloqueio && (
          <AppBlockStatusCard
            apps={appsBloqueadosResolvidos}
            ativo={bloqueioApps.ativo}
            ativoAgora={bloqueioAtivoAgora}
            horarioInicio={bloqueioApps.horarioInicio ?? '--:--'}
            horarioFim={bloqueioApps.horarioFim ?? '--:--'}
          />
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
