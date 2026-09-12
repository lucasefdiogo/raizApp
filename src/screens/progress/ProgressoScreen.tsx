import React, { useCallback, useState } from 'react';
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
import { DayStatusPill } from '../../components/progress/DayStatusPill';
import { DayDetailSheet } from '../../components/progress/DayDetailSheet';
import { ChallengeCard } from '../../components/challenges/ChallengeCard';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { EmptyState } from '../../components/common/EmptyState';

interface ProgressoScreenProps {
  uid: string;
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
  const diaSemana = new Date(`${dataISO}T00:00:00Z`).getUTCDay();
  return LABEL_DIA_SEMANA[diaSemana];
}

function labelCompletoParaData(dataISO: string): string {
  const diaSemana = new Date(`${dataISO}T00:00:00Z`).getUTCDay();
  return LABEL_DIA_SEMANA_COMPLETO[diaSemana];
}

export function ProgressoScreen({ uid }: ProgressoScreenProps) {
  useVoltarParaAbaHoje();

  const { historico, streakAtual, diasTotaisAtivos, carregando, recarregar } =
    useProgressoSemanal(uid);
  const {
    desafioSemanal,
    desafioMensal,
    recarregar: recarregarDesafios,
  } = useDesafios(uid);
  const {
    dataSelecionada,
    tarefasDoDia,
    statusDoDia,
    buscarDia,
    limparSelecao,
  } = useDayDetail(uid);
  const [atualizando, setAtualizando] = useState(false);

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
      // as duas releituras já tratam a própria falha (toast) e resolvem sem
      // rejeitar — o gesto só espera as duas terminarem.
      await Promise.all([recarregar(), recarregarDesafios()]);
    } finally {
      setAtualizando(false);
    }
  }, [recarregar, recarregarDesafios]);

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

            {(desafioSemanal || desafioMensal) && (
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
          onClose={limparSelecao}
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
