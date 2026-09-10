import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useProgressoSemanal } from '../../hooks/useProgressoSemanal';
import { DayStatusPill } from '../../components/progress/DayStatusPill';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';

interface ProgressoScreenProps {
  uid: string;
}

const LABEL_DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function labelParaData(dataISO: string): string {
  const diaSemana = new Date(`${dataISO}T00:00:00Z`).getUTCDay();
  return LABEL_DIA_SEMANA[diaSemana];
}

export function ProgressoScreen({ uid }: ProgressoScreenProps) {
  const { historico, streakAtual, diasTotaisAtivos, carregando } =
    useProgressoSemanal(uid);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Seu progresso</Text>
        {carregando ? (
          <LoadingIndicator variant="inline" label="Calculando seu progresso" />
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
                <DayStatusPill
                  key={dia.data}
                  status={dia.status}
                  label={labelParaData(dia.data)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
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
