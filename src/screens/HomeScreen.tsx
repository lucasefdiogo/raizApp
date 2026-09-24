import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useStreakMilestone } from '../hooks/useStreakMilestone';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { useAppBlockConfig } from '../hooks/useAppBlockConfig';
import { useAccessibilityPermission } from '../hooks/useAccessibilityPermission';
import { useAppBlockBannerDismissido } from '../hooks/useAppBlockBannerDismissido';
import { useRecarregarAoFocar } from '../hooks/useRecarregarAoFocar';
import { useNomeUsuario } from '../hooks/useNomeUsuario';
import { useFeatureTour } from '../hooks/useFeatureTour';
import { HomeHeader } from '../components/home/HomeHeader';
import { StreakCard } from '../components/StreakCard';
import { TaskList } from '../components/TaskList';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { EmptyState } from '../components/common/EmptyState';
import { AddTaskForm } from '../components/home/AddTaskForm';
import { TaskCompletedOverlay } from '../components/home/TaskCompletedOverlay';
import { RootWateringOverlay } from '../components/home/RootWateringOverlay';
import { StreakMilestoneModal } from '../components/home/StreakMilestoneModal';
import { AppBlockBanner } from '../components/home/AppBlockBanner';
import { AppBlockStatusCard } from '../components/home/AppBlockStatusCard';
import {
  FeatureTourOverlayProps,
  MedidaAlvoTour,
  RefAlvoTour,
} from '../components/tour/FeatureTourOverlay';
import {
  ALTURA_MINIMA_TOOLTIP_TOUR,
  TOTAL_PASSOS_TOUR,
  TOUR_PASSOS,
  TourAlvoId,
} from '../components/tour/tourSteps';
import { StatusDia, Tarefa } from '../domain/types';
import { existeEssencialConcluida } from '../domain/streak';
import { selecionarTarefaIntercept } from '../domain/intercept';
import { obterMensagemTarefaConcluida } from '../utils/taskFeedbackMessages';
import { TravadoFlowScreen } from './intercept/TravadoFlowScreen';

// No Android com edge-to-edge (RN 0.81+) o `adjustResize` não encolhe mais a
// janela — o teclado entra por cima. Então acompanhamos a altura do teclado à
// mão, criamos espaço equivalente no fim do ScrollView e rolamos até lá pra o
// campo "Nova tarefa" ficar acima do teclado.
const ATRASO_SCROLL_TECLADO_MS = 50;

// Passos do tour de funcionalidades cujo alvo vive dentro do ScrollView (os
// outros dois apontam pra tab bar, que nunca rola). Mesma ideia do atraso
// acima: dá tempo do scroll assentar antes de remedir a posição final.
const ALVOS_ROLAVEIS_TOUR: TourAlvoId[] = [
  'streak',
  'adicionarTarefa',
  'bloqueioApps',
];
const ATRASO_MEDICAO_TOUR_MS = 80;
// Maior que ALTURA_MINIMA_TOOLTIP_TOUR de propósito: aqui a checagem é
// grosseira — alturaJanela (useWindowDimensions) é a altura CHEIA da
// janela, sem descontar a tab bar nem a barra de gestos do Android (a
// HomeScreen não sabe a altura exata de nenhuma das duas). A folga
// extra cobre as duas, pra quase nunca depender do fallback de scroll
// interno do próprio balão (ver FeatureTourOverlay, que sim calcula a área
// segura com precisão via useSafeAreaInsets — bug real visto em device
// físico: com uma folga pequena aqui, a HomeScreen achava "cabe" e nunca
// rolava, mas o balão ficava espremido/cortado mesmo assim).
const ESPACO_MINIMO_SCROLL_TOUR_PX = ALTURA_MINIMA_TOOLTIP_TOUR + 160;

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
  /** Refs dos botões reais das abas Progresso/Perfil (criados no
   * MainTabNavigator) — usados só pra medir a posição nos passos 4-5 do
   * tour de funcionalidades, ver useFeatureTour/FeatureTourOverlay. */
  progressoTabRef: RefAlvoTour;
  perfilTabRef: RefAlvoTour;
  /**
   * A HomeScreen não renderiza o FeatureTourOverlay ela mesma — quem
   * decide o passo/avança/mede os alvos é ela, mas quem desenha é o
   * MainTabNavigator (só ele cobre a tab bar também, ver comentário em
   * FeatureTourOverlay.tsx). Chamado com `null` quando o tour não está
   * ativo.
   */
  aoAtualizarTour: (props: FeatureTourOverlayProps | null) => void;
}

export function HomeScreen({
  uid,
  streakAtual,
  escudosDisponiveis,
  marcoAtingido,
  avaliarAlertaRisco,
  recarregarStreak,
  aoAbrirBloqueioApps,
  progressoTabRef,
  perfilTabRef,
  aoAtualizarTour,
}: HomeScreenProps) {
  const nome = useNomeUsuario(uid);
  const { marcoParaExibir, corpoParaExibir, limparMarcoExibido } =
    useStreakMilestone(marcoAtingido);
  const {
    tarefas,
    alternarTarefa,
    adicionarTarefa,
    editarTarefa,
    removerTarefa,
    removerTarefaHoje,
    pararDeRepetir,
    criarSubtarefa,
    moverTarefaParaAmanha,
    statusDia,
    carregando,
    limiteEssenciaisAtingido,
    recarregar,
  } = useDailyTasks(uid);
  const [travadoAberto, setTravadoAberto] = useState(false);
  const [travadoAberturaId, setTravadoAberturaId] = useState(0);
  const [travadoTarefaContexto, setTravadoTarefaContexto] =
    useState<Tarefa | null>(null);
  const {
    appsInstalados,
    configAtual: bloqueioApps,
    ativoAgora: bloqueioAtivoAgora,
    carregando: bloqueioCarregando,
    recarregar: recarregarBloqueioApps,
  } = useAppBlockConfig(uid);
  const {
    ativo: acessibilidadeAtiva,
    carregando: acessibilidadeCarregando,
    abrirConfiguracoes: abrirConfiguracoesAcessibilidade,
  } = useAccessibilityPermission();
  const banner = useAppBlockBannerDismissido();
  // A Home não desmonta quando empurra a AppBlockConfigScreen na mesma
  // stack (HojeStack) — só perde o foco. Sem isso, editar a config lá e
  // voltar mostrava o banner/status card com dados obsoletos.
  useRecarregarAoFocar(recarregarBloqueioApps);
  const [overlayVisivel, setOverlayVisivel] = useState(false);
  const [mensagemOverlay, setMensagemOverlay] = useState('');
  const [overlayRaizVisivel, setOverlayRaizVisivel] = useState(false);
  // Congelado no momento do toque (igual a mensagemOverlay acima) — não
  // recalcula a cada render enquanto a animação de regar está na tela.
  const [dadosOverlayRaiz, setDadosOverlayRaiz] = useState({
    diasSequencia: 0,
    submensagem: '',
  });
  const [atualizando, setAtualizando] = useState(false);
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const tour = useFeatureTour();
  const streakCardRef = useRef<React.ComponentRef<typeof View>>(null);
  const addTaskButtonRef = useRef<React.ComponentRef<typeof View>>(null);
  const appBlockRef = useRef<React.ComponentRef<typeof View>>(null);
  const scrollYRef = useRef(0);
  const [medidaAlvoTour, setMedidaAlvoTour] = useState<MedidaAlvoTour | null>(
    null,
  );
  const { height: alturaJanela } = useWindowDimensions();

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

      if (vaiConcluir && tarefa) {
        if (tarefa.essencial) {
          // Concluir QUALQUER essencial já satisfaz avaliarDiaCumprido — não
          // precisa esperar statusDia recalcular (que ainda reflete o
          // `tarefas` de antes do toque neste mesmo closure) pra saber que
          // hoje passou a contar: streakAtual + 1 é sempre o valor correto
          // aqui, mesmo padrão do +1 visual já usado no StreakCard.
          setDadosOverlayRaiz({
            diasSequencia: streakAtual + 1,
            submensagem: obterMensagemTarefaConcluida(),
          });
          setOverlayRaizVisivel(true);
        } else {
          setMensagemOverlay(obterMensagemTarefaConcluida());
          setOverlayVisivel(true);
        }
      }
    },
    [tarefas, alternarTarefa, streakAtual],
  );

  const esconderOverlay = useCallback(() => setOverlayVisivel(false), []);
  const esconderOverlayRaiz = useCallback(() => setOverlayRaizVisivel(false), []);

  // As 3 entradas do TravadoFlow (seção 2 da spec 09-ponte-fuga-tarefa)
  // compartilham a mesma origem='travado' — o que muda é só a tarefa de
  // contexto, resolvida na hora de abrir. `travadoAberturaId` força um
  // remount real do componente a cada abertura (mesmo racional de
  // deteccaoId em useAppBlocking), pra nunca reaparecer no passo/estado da
  // vez anterior.
  const abrirTravado = useCallback((tarefaContexto: Tarefa | null) => {
    setTravadoTarefaContexto(tarefaContexto);
    setTravadoAberturaId(atual => atual + 1);
    setTravadoAberto(true);
  }, []);

  const abrirTravadoComTarefa = useCallback(
    (id: string) => {
      abrirTravado(tarefas.find(tarefa => tarefa.id === id) ?? null);
    },
    [tarefas, abrirTravado],
  );

  const abrirTravadoDaHome = useCallback(() => {
    const resultado = selecionarTarefaIntercept({ tarefas }, new Date());
    abrirTravado(resultado.estado === 'A' ? resultado.tarefa : null);
  }, [tarefas, abrirTravado]);

  const fecharTravado = useCallback(() => setTravadoAberto(false), []);

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
  // Só vale a pena avisar quando o bloqueio está de fato configurado como
  // ativo — accessibility desligada com o bloqueio já desligado no toggle
  // geral não é uma surpresa ruim pra ninguém.
  const mostrarAvisoAcessibilidadeDesativada =
    mostrarStatusBloqueio &&
    bloqueioApps.ativo &&
    !acessibilidadeCarregando &&
    !acessibilidadeAtiva;

  const handleScroll = useCallback(
    (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = evento.nativeEvent.contentOffset.y;
    },
    [],
  );

  // Mede o alvo real do passo atual do tour em coordenadas de janela (não
  // relativas ao pai — measureInWindow, não onLayout, ver racional da
  // tarefa). Alvos 1-3 vivem dentro do ScrollView e podem estar fora da
  // faixa visível quando o passo começa (ex: lista de tarefas longa empurra
  // o botão "Adicionar tarefa" pra baixo) — nesse caso rola até uma posição
  // previsível antes de remedir. O tour bloqueia toque no resto da tela
  // (ver FeatureTourOverlay), então não existe scroll "ao vivo" pra
  // acompanhar durante um passo, só essa correção pontual ao entrar nele.
  useEffect(() => {
    if (!tour.tourAtivo) {
      setMedidaAlvoTour(null);
      return;
    }

    const alvoId = TOUR_PASSOS[tour.passoAtual].alvo;
    const refsPorAlvo: Record<TourAlvoId, RefAlvoTour> = {
      streak: streakCardRef,
      adicionarTarefa: addTaskButtonRef,
      bloqueioApps: appBlockRef,
      abaProgresso: progressoTabRef,
      abaPerfil: perfilTabRef,
    };
    const node = refsPorAlvo[alvoId].current;
    if (!node) {
      setMedidaAlvoTour(null);
      return;
    }

    let cancelado = false;
    let idTimeout: ReturnType<typeof setTimeout> | undefined;
    const alvoRolavel = ALVOS_ROLAVEIS_TOUR.includes(alvoId);

    node.measureInWindow((x, y, width, height) => {
      if (cancelado) {
        return;
      }

      const dentroDaFaixaVisivel =
        !alvoRolavel ||
        (y >= ESPACO_MINIMO_SCROLL_TOUR_PX &&
          y + height <= alturaJanela - ESPACO_MINIMO_SCROLL_TOUR_PX);

      if (dentroDaFaixaVisivel) {
        setMedidaAlvoTour({ x, y, width, height });
        return;
      }

      scrollRef.current?.scrollTo({
        y: scrollYRef.current + (y - ESPACO_MINIMO_SCROLL_TOUR_PX),
        animated: false,
      });
      idTimeout = setTimeout(() => {
        if (cancelado) {
          return;
        }
        node.measureInWindow((x2, y2, width2, height2) => {
          if (!cancelado) {
            setMedidaAlvoTour({ x: x2, y: y2, width: width2, height: height2 });
          }
        });
      }, ATRASO_MEDICAO_TOUR_MS);
    });

    return () => {
      cancelado = true;
      if (idTimeout) {
        clearTimeout(idTimeout);
      }
    };
  }, [
    tour.tourAtivo,
    tour.passoAtual,
    carregando,
    bloqueioCarregando,
    mostrarBannerBloqueio,
    mostrarStatusBloqueio,
    alturaJanela,
    progressoTabRef,
    perfilTabRef,
  ]);

  // Repassa o estado do tour pra cima — quem efetivamente desenha é o
  // MainTabNavigator (ver FeatureTourOverlay.tsx pro motivo). `null`
  // desliga o overlay lá em cima.
  useEffect(() => {
    if (!tour.tourAtivo) {
      aoAtualizarTour(null);
      return;
    }
    aoAtualizarTour({
      passoAtual: tour.passoAtual,
      totalPassos: TOTAL_PASSOS_TOUR,
      texto: TOUR_PASSOS[tour.passoAtual].texto,
      medida: medidaAlvoTour,
      onAvancar: tour.avancar,
      onPular: tour.pular,
    });
  }, [
    tour.tourAtivo,
    tour.passoAtual,
    tour.avancar,
    tour.pular,
    medidaAlvoTour,
    aoAtualizarTour,
  ]);

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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
        <HomeHeader nome={nome} streakAtual={streakAtual} />
        <View ref={streakCardRef} collapsable={false}>
          <StreakCard
            streak={{ streakAtual, escudosDisponiveis }}
            hojeCumprido={statusDia === 'cumprido'}
          />
        </View>
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
                onEstouTravado={abrirTravadoComTarefa}
                onEditar={(id, titulo) => editarTarefa(id, { titulo })}
                onRemover={removerTarefa}
                onRemoverHoje={removerTarefaHoje}
                onPararDeRepetir={pararDeRepetir}
              />
            )}
            <Pressable
              testID="botao-estou-travado"
              accessibilityRole="button"
              onPress={abrirTravadoDaHome}
              hitSlop={8}
              style={styles.botaoEstouTravado}
            >
              <Text style={styles.botaoEstouTravadoTexto}>Estou travado</Text>
            </Pressable>
            <AddTaskForm
              ref={addTaskButtonRef}
              onAdicionar={adicionarTarefa}
              limiteEssenciaisAtingido={limiteEssenciaisAtingido}
            />
          </>
        )}

        <View ref={appBlockRef} collapsable={false}>
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
              acessibilidadeDesativada={mostrarAvisoAcessibilidadeDesativada}
              onReativarAcessibilidade={abrirConfiguracoesAcessibilidade}
            />
          )}
        </View>
      </ScrollView>
      <TaskCompletedOverlay
        visible={overlayVisivel}
        mensagem={mensagemOverlay}
        onHide={esconderOverlay}
      />
      <RootWateringOverlay
        visible={overlayRaizVisivel}
        diasSequencia={dadosOverlayRaiz.diasSequencia}
        submensagem={dadosOverlayRaiz.submensagem}
        appsDesbloqueados={appsBloqueadosResolvidos.map(app => app.nome)}
        onHide={esconderOverlayRaiz}
      />
      {marcoParaExibir !== null && (
        <StreakMilestoneModal
          marco={marcoParaExibir}
          corpo={corpoParaExibir}
          visible={!overlayVisivel && !overlayRaizVisivel}
          onDismiss={limparMarcoExibido}
        />
      )}
      {travadoAberto && (
        <TravadoFlowScreen
          key={travadoAberturaId}
          uid={uid}
          tarefaContexto={travadoTarefaContexto}
          tarefas={tarefas}
          origem="travado"
          criarSubtarefa={criarSubtarefa}
          editarTarefa={editarTarefa}
          moverTarefaParaAmanha={moverTarefaParaAmanha}
          alternarTarefa={alternarTarefa}
          onFechar={fecharTravado}
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
  botaoEstouTravado: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  botaoEstouTravadoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
