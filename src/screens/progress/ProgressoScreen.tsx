import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useProgressoSemanal } from '../../hooks/useProgressoSemanal';
import { useDesafios } from '../../hooks/useDesafios';
import { useVoltarParaAbaHoje } from '../../hooks/useVoltarParaAbaHoje';
import { useDayDetail } from '../../hooks/useDayDetail';
import { useResumoRedes } from '../../hooks/useResumoRedes';
import { useDesafioReducao } from '../../hooks/useDesafioReducao';
import { useToast } from '../../hooks/useToast';
import { DayStatusPill } from '../../components/progress/DayStatusPill';
import { DayDetailSheet } from '../../components/progress/DayDetailSheet';
import { ResumoRedesCard } from '../../components/progress/ResumoRedesCard';
import { ReflexaoSemanalSheet } from '../../components/progress/ReflexaoSemanalSheet';
import { ChallengeCard } from '../../components/challenges/ChallengeCard';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { EmptyState } from '../../components/common/EmptyState';
import { dataLocalDeISO, paraISOLocal } from '../../domain/data';
import { inicioDaSemana } from '../../domain/streak';
import { STORAGE_KEYS, lerItem, salvarItem } from '../../utils/storage';
import { useAnalytics } from '../../hooks/useAnalytics';

interface ProgressoScreenProps {
  uid: string;
  /** Abre a divulgação do acesso de uso (HU-08, RN04) a partir do link "Medir tempo". */
  aoTocarMedirTempo: () => void;
}

const LABEL_DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const LABEL_DIA_SEMANA_COMPLETO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function labelParaData(dataISO: string): string {
  const diaSemana = dataLocalDeISO(dataISO).getDay();
  return LABEL_DIA_SEMANA[diaSemana];
}

function labelCompletoParaData(dataISO: string): string {
  const diaSemana = dataLocalDeISO(dataISO).getDay();
  return LABEL_DIA_SEMANA_COMPLETO[diaSemana];
}

export function ProgressoScreen({ uid, aoTocarMedirTempo }: ProgressoScreenProps) {
  useVoltarParaAbaHoje();

  const { historico, streakAtual, diasTotaisAtivos, carregando, recarregar } =
    useProgressoSemanal(uid);
  const {
    desafioSemanal,
    desafioMensal,
    recarregar: recarregarDesafios,
  } = useDesafios(uid);
  const {
    resumoCard,
    reflexao,
    comAcessoDeUso,
    appsBloqueados,
    carregando: carregandoResumoRedes,
    recarregar: recarregarResumoRedes,
  } = useResumoRedes(uid);
  const {
    proposta,
    desafioAtivo,
    resultadoAnteriorTexto,
    aceitar: aceitarDesafioReducao,
    recusar: recusarDesafioReducao,
    recarregar: recarregarDesafioReducao,
  } = useDesafioReducao(uid, !!reflexao);
  const { showToast } = useToast();
  const {
    dataSelecionada,
    tarefasDoDia,
    statusDoDia,
    detalheRedes,
    buscarDia,
    limparSelecao,
  } = useDayDetail(uid, comAcessoDeUso, appsBloqueados);
  const [atualizando, setAtualizando] = useState(false);
  const [mostrarReflexao, setMostrarReflexao] = useState(false);
  const avaliouReflexaoRef = useRef(false);
  const {
    logReflexaoSemanalExibida,
    logReflexaoSemanalFechada,
    logDesafioReducaoProposto,
  } = useAnalytics();
  const propostaLogadaRef = useRef(false);

  const handleTocarDia = useCallback(
    (data: string, status: string) => {
      if (status === 'sem_registro') {
        return;
      }
      buscarDia(data);
    },
    [buscarDia],
  );

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      // as releituras já tratam a própria falha (toast) e resolvem sem
      // rejeitar — o gesto só espera todas terminarem.
      await Promise.all([
        recarregar(),
        recarregarDesafios(),
        recarregarResumoRedes(),
        recarregarDesafioReducao(),
      ]);
    } finally {
      setAtualizando(false);
    }
  }, [recarregar, recarregarDesafios, recarregarResumoRedes, recarregarDesafioReducao]);

  // Reflexão semanal (HU-08, RN10/RN12): avalia uma única vez por abertura
  // da tela — se já não foi mostrada nesta semana (AsyncStorage) e há dados
  // suficientes (reflexao não nulo, já considera consentimento + base de
  // dias em useResumoRedes).
  useEffect(() => {
    if (avaliouReflexaoRef.current || carregandoResumoRedes) {
      return;
    }
    avaliouReflexaoRef.current = true;
    if (!reflexao) {
      return;
    }
    (async () => {
      const semanaAtualISO = paraISOLocal(inicioDaSemana(new Date()));
      const vistaEm = await lerItem<string>(STORAGE_KEYS.reflexaoSemanalVista);
      if (vistaEm !== semanaAtualISO) {
        setMostrarReflexao(true);
        logReflexaoSemanalExibida();
      }
    })();
  }, [carregandoResumoRedes, reflexao, logReflexaoSemanalExibida]);

  // Evento de analytics só uma vez por abertura da sheet com proposta — um
  // recarregar() que troca a referência de `proposta` sem reabrir a sheet
  // não deve logar de novo.
  useEffect(() => {
    if (!mostrarReflexao) {
      propostaLogadaRef.current = false;
      return;
    }
    if (proposta && !propostaLogadaRef.current) {
      propostaLogadaRef.current = true;
      logDesafioReducaoProposto();
    }
  }, [mostrarReflexao, proposta, logDesafioReducaoProposto]);

  const fecharReflexao = useCallback(async (acao: 'entendi' | 'agora_nao') => {
    await salvarItem(STORAGE_KEYS.reflexaoSemanalVista, paraISOLocal(inicioDaSemana(new Date())));
    logReflexaoSemanalFechada(acao);
    if (proposta) {
      await recusarDesafioReducao();
    }
    setMostrarReflexao(false);
  }, [logReflexaoSemanalFechada, proposta, recusarDesafioReducao]);

  const aceitarPropostaDesafio = useCallback(async () => {
    await salvarItem(STORAGE_KEYS.reflexaoSemanalVista, paraISOLocal(inicioDaSemana(new Date())));
    await aceitarDesafioReducao();
    showToast('Combinado. Aparece no seu Progresso.');
    setMostrarReflexao(false);
  }, [aceitarDesafioReducao, showToast]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        testID="progresso-scroll"
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            testID="progresso-refresh-control"
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={[theme.colors.musgo]}
            tintColor={theme.colors.musgo}
          />
        }
      >
        <Text style={styles.titulo}>Seu progresso</Text>
        {carregando ? (
          <LoadingIndicator variant="inline" label="Calculando seu progresso" />
        ) : diasTotaisAtivos === 0 ? (
          <EmptyState
            titulo="Seu progresso vai aparecer aqui"
            corpo="Volte depois de cumprir seu primeiro dia — cada um vai contar pra esse histórico."
          />
        ) : (
          <>
            <View style={styles.resumo}>
              <View style={styles.resumoItem}>
                <Text style={styles.resumoValor}>{streakAtual}</Text>
                <Text style={styles.resumoRotulo}>
                  {streakAtual === 1 ? 'dia seguido' : 'dias seguidos'}
                </Text>
              </View>
              <View style={styles.resumoItem}>
                <Text style={styles.resumoValor}>{diasTotaisAtivos}</Text>
                <Text style={styles.resumoRotulo}>
                  {diasTotaisAtivos === 1
                    ? 'dia ativo no total'
                    : 'dias ativos no total'}
                </Text>
              </View>
            </View>
            <Text style={styles.secaoTitulo}>Últimos 7 dias</Text>
            <View style={styles.semana}>
              {historico.map(dia => (
                <Pressable
                  key={dia.data}
                  testID={`day-pill-${dia.data}`}
                  accessibilityRole="button"
                  onPress={() => handleTocarDia(dia.data, dia.status)}
                >
                  <DayStatusPill status={dia.status} label={labelParaData(dia.data)} />
                </Pressable>
              ))}
            </View>

            {!carregandoResumoRedes && (
              <ResumoRedesCard
                comAcessoDeUso={comAcessoDeUso}
                resumo={resumoCard}
                onMedirTempo={aoTocarMedirTempo}
              />
            )}

            {(desafioSemanal || desafioMensal || desafioAtivo) && (
              <>
                <Text style={styles.secaoTitulo}>Desafios</Text>
                {desafioSemanal && (
                  <ChallengeCard
                    titulo={desafioSemanal.titulo}
                    progresso={desafioSemanal.progresso}
                    meta={desafioSemanal.meta}
                    status={desafioSemanal.status}
                  />
                )}
                {desafioMensal && (
                  <ChallengeCard
                    titulo={desafioMensal.titulo}
                    progresso={desafioMensal.progresso}
                    meta={desafioMensal.meta}
                    status={desafioMensal.status}
                  />
                )}
                {desafioAtivo && (
                  <ChallengeCard
                    titulo={desafioAtivo.titulo}
                    progresso={desafioAtivo.progresso}
                    meta={desafioAtivo.meta}
                    status={desafioAtivo.status}
                    variante="teto"
                    diasRestantesTexto={desafioAtivo.diasRestantesTexto}
                    ultrapassou={desafioAtivo.ultrapassou}
                    semMedicaoDesde={desafioAtivo.semMedicaoDesde ?? undefined}
                  />
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {dataSelecionada && statusDoDia && (
        <DayDetailSheet
          visible
          label={labelCompletoParaData(dataSelecionada)}
          status={statusDoDia}
          tarefas={tarefasDoDia}
          detalheRedes={detalheRedes}
          onClose={limparSelecao}
        />
      )}

      {mostrarReflexao && reflexao && (
        <ReflexaoSemanalSheet
          visible
          dados={reflexao}
          proposta={proposta}
          resultadoAnteriorTexto={resultadoAnteriorTexto}
          onEntendi={() => fecharReflexao('entendi')}
          onAgoraNao={() => fecharReflexao('agora_nao')}
          onAceitarProposta={aceitarPropostaDesafio}
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
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  resumo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumoItem: {
    alignItems: 'center',
  },
  resumoValor: {
    fontSize: theme.typography.fontSize.xxl * 1.5,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  resumoRotulo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  secaoTitulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  semana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
