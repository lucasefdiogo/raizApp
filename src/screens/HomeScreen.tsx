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
import { useNomeUsuario } from '../hooks/useNomeUsuario';
import { useAlternativaNoturna } from '../hooks/useAlternativaNoturna';
import { useColetaUsoApps } from '../hooks/useColetaUsoApps';
import { useSincronizarAcessibilidade } from '../hooks/useSincronizarAcessibilidade';
import { useAbrirDestinoDaNotificacao } from '../hooks/useAbrirDestinoDaNotificacao';
import { useFeatureTour } from '../hooks/useFeatureTour';
import { useSincronizarRegrasBloqueio } from '../hooks/useSincronizarRegrasBloqueio';
import { HomeHeader } from '../components/home/HomeHeader';
import { StreakCard } from '../components/StreakCard';
import { TaskList } from '../components/TaskList';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { EmptyState } from '../components/common/EmptyState';
import { AddTaskForm } from '../components/home/AddTaskForm';
import { TaskCompletedOverlay } from '../components/home/TaskCompletedOverlay';
import { RootWateringOverlay } from '../components/home/RootWateringOverlay';
import { StreakMilestoneModal } from '../components/home/StreakMilestoneModal';
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
import { Tarefa } from '../domain/types';
import { existeEssencialConcluida } from '../domain/streak';
import { contarEssenciais, textoPlacarEssenciais } from '../domain/dailyTasks';
import { selecionarTarefaIntercept } from '../domain/intercept';
import { obterMensagemTarefaConcluida } from '../utils/taskFeedbackMessages';
import { TravadoFlowScreen } from './intercept/TravadoFlowScreen';

// No Android com edge-to-edge (RN 0.81+) o `adjustResize` não encolhe mais a
// janela — o teclado entra por cima. Então acompanhamos a altura do teclado à
// mão, criamos espaço equivalente no fim do ScrollView e rolamos até lá pra o
// campo "Nova alternativa" ficar acima do teclado.
const ATRASO_SCROLL_TECLADO_MS = 50;

// Passos do tour de funcionalidades cujo alvo vive dentro do ScrollView (os
// outros dois apontam pra tab bar, que nunca rola). Mesma ideia do atraso
// acima: dá tempo do scroll assentar antes de remedir a posição final.
const ALVOS_ROLAVEIS_TOUR: TourAlvoId[] = ['streak', 'adicionarTarefa'];
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

// HU-07, RN01/RN04: headline e linha de apoio da seção de tarefas, chaveados
// por hojeCumprido — sem essa chave vira o placar de essenciais (RN03).
const HEADLINE: Record<'pendente' | 'cumprido', string> = {
  pendente: 'O que você vai fazer no lugar da rolagem hoje?',
  cumprido: 'Hoje já conta. O resto é bônus.',
};

const LINHA_DE_APOIO_CUMPRIDO =
  'Se a vontade de abrir o feed aparecer, escolha uma daqui.';

interface HomeScreenProps {
  uid: string;
  streakAtual: number;
  marcoAtingido: number | null;
  avaliarAlertaRisco: (essencialConcluidaHoje: boolean) => void;
  /**
   * Releitura do streak sob demanda — o useStreak vive no HojeStack, então o
   * pull-to-refresh da Home recebe a função de lá pra atualizar o badge de
   * streak no mesmo gesto que atualiza as tarefas.
   */
  recarregarStreak: () => Promise<void>;
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
  marcoAtingido,
  avaliarAlertaRisco,
  recarregarStreak,
  progressoTabRef,
  perfilTabRef,
  aoAtualizarTour,
}: HomeScreenProps) {
  const nome = useNomeUsuario(uid);
  const alternativaNoturna = useAlternativaNoturna(uid);
  // Home é a aba padrão — "abertura do app" pra fins de
  // useSincronizarRegrasBloqueio (promove regrasBloqueioPendentes vencida e
  // espelha o estado atual em SharedPreferences pro AccessibilityService).
  useSincronizarRegrasBloqueio(uid);
  // Coleta o uso das redes dos últimos 7 dias (HU-02); silenciosa e só com
  // acesso de uso concedido e consentimento gravado.
  useColetaUsoApps(uid);
  // Espelha notificacoesAtivas, verifica o desligamento do serviço de
  // acessibilidade e envia os eventos pendentes (HU-03); silencioso.
  useSincronizarAcessibilidade(uid);
  // Opens Bloqueio de apps when the app was opened by the reminder (HU-03).
  useAbrirDestinoDaNotificacao();
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
  const hojeCumprido = statusDia === 'cumprido';
  const [sheetAdicionarVisivel, setSheetAdicionarVisivel] = useState(false);
  const abrirSheetAdicionar = useCallback(
    () => setSheetAdicionarVisivel(true),
    [],
  );
  const fecharSheetAdicionar = useCallback(
    () => setSheetAdicionarVisivel(false),
    [],
  );
  const [travadoAberto, setTravadoAberto] = useState(false);
  const [travadoAberturaId, setTravadoAberturaId] = useState(0);
  const [travadoTarefaContexto, setTravadoTarefaContexto] =
    useState<Tarefa | null>(null);
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
  // remount real do componente a cada abertura, pra nunca reaparecer no
  // passo/estado da vez anterior.
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
  // o botão "Adicionar alternativa" pra baixo) — nesse caso rola até uma posição
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
          <StreakCard streak={{ streakAtual }} hojeCumprido={hojeCumprido} />
        </View>
        {carregando ? (
          <LoadingIndicator variant="inline" />
        ) : tarefas.length === 0 ? (
          // HU-07, RN10: dia sem nenhuma tarefa — única ação é o CTA
          // tracejado do próprio EmptyState, sem headline/placar/"Estou
          // travado" por cima (o broto já é o destaque da tela).
          <EmptyState
            titulo="Nada planejado ainda"
            corpo="Escolha uma coisa pequena para fazer no lugar da rolagem."
            ctaLabel="Adicionar alternativa"
            onCtaPress={abrirSheetAdicionar}
          />
        ) : (
          <>
            <Text style={styles.headline}>{HEADLINE[hojeCumprido ? 'cumprido' : 'pendente']}</Text>
            <Text style={hojeCumprido ? styles.linhaDeApoio : styles.placar}>
              {hojeCumprido ? LINHA_DE_APOIO_CUMPRIDO : textoPlacarEssenciais(tarefas)}
            </Text>
            <TaskList
              tarefas={tarefas}
              onAlternar={handleAlternarTarefa}
              onEstouTravado={abrirTravadoComTarefa}
              onEditar={(id, titulo) => editarTarefa(id, { titulo })}
              onRemover={removerTarefa}
              onRemoverHoje={removerTarefaHoje}
              onPararDeRepetir={pararDeRepetir}
            />
            <Pressable
              testID="botao-estou-travado"
              accessibilityRole="button"
              onPress={abrirTravadoDaHome}
              hitSlop={8}
              style={styles.botaoEstouTravado}
            >
              <Text style={styles.botaoEstouTravadoTexto}>Estou travado</Text>
            </Pressable>
            <View ref={addTaskButtonRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                onPress={abrirSheetAdicionar}
                hitSlop={8}
                style={styles.botaoAdicionarAlternativa}
              >
                <Text style={styles.botaoAdicionarAlternativaTexto}>
                  Adicionar alternativa
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
      <AddTaskForm
        visible={sheetAdicionarVisivel}
        onFechar={fecharSheetAdicionar}
        onAdicionar={adicionarTarefa}
        limiteEssenciaisAtingido={limiteEssenciaisAtingido}
        essenciaisUsadas={contarEssenciais(tarefas)}
        alternativaNoturna={alternativaNoturna}
      />
      <TaskCompletedOverlay
        visible={overlayVisivel}
        mensagem={mensagemOverlay}
        onHide={esconderOverlay}
      />
      <RootWateringOverlay
        visible={overlayRaizVisivel}
        diasSequencia={dadosOverlayRaiz.diasSequencia}
        submensagem={dadosOverlayRaiz.submensagem}
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
  headline: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  // Placar em Space Mono (RN03) — linha de apoio do estado cumprido (RN04)
  // usa a fonte de corpo normal, por isso os dois estilos ficam separados.
  placar: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
  },
  linhaDeApoio: {
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
  // Sem Cobre: o único ponto Cobre da Home é o crescimento da raiz no
  // StreakCard (HU-07, regras visuais da seção 3).
  botaoAdicionarAlternativa: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  botaoAdicionarAlternativaTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgo,
  },
});
