import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { InterceptRoot } from '../intercept/InterceptRoot';
import { Tarefa } from '../../domain/types';

const APP_MOCK = { packageName: 'com.instagram.android', appLabel: 'Instagram' };

const TAREFAS_ESTADO_A: Tarefa[] = [
  {
    id: 'debug-a',
    titulo: 'Abrir o material de estudo por 5 minutos',
    essencial: true,
    concluida: false,
  },
];

const TAREFAS_ESTADO_B: Tarefa[] = [
  {
    id: 'debug-b',
    titulo: 'Abrir o material de estudo por 5 minutos',
    essencial: true,
    concluida: true,
  },
];

const TAREFAS_ESTADO_C: Tarefa[] = [];

type Cenario = 'A' | 'B' | 'C' | null;

const TAREFAS_POR_CENARIO: Record<Exclude<Cenario, null>, Tarefa[]> = {
  A: TAREFAS_ESTADO_A,
  B: TAREFAS_ESTADO_B,
  C: TAREFAS_ESTADO_C,
};

/**
 * Tela SÓ de validação manual da InterceptScreen (Etapa 3 da spec
 * 09-ponte-fuga-tarefa) — abre o root 'Intercept' de verdade
 * (InterceptRoot), com props mockadas simulando cada estado (seção 3),
 * enquanto o nativo (Etapa 4) não decide isso de verdade. Não é UI final do
 * produto — vai ser removida/escondida numa tarefa futura, mesmo padrão de
 * AccessibilityDebugScreen. `aoSairOverride` volta pra esta tela em vez de
 * fechar o app (o root real usa BackHandler.exitApp — ver InterceptRoot).
 */
export function InterceptDebugScreen() {
  const [cenario, setCenario] = useState<Cenario>(null);

  if (cenario !== null) {
    return (
      <InterceptRoot
        packageName={APP_MOCK.packageName}
        appLabel={APP_MOCK.appLabel}
        snapshotJson={JSON.stringify({ tarefas: TAREFAS_POR_CENARIO[cenario] })}
        aoSairOverride={() => setCenario(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Debug — InterceptScreen</Text>
      <Text style={styles.corpo}>
        Cada botão abre o root 'Intercept' de verdade, com um snapshot
        mockado pro estado correspondente (seção 3 da spec).
      </Text>
      <PrimaryButton
        titulo="Simular estado A (essencial pendente)"
        onPress={() => setCenario('A')}
      />
      <PrimaryButton
        titulo="Simular estado B (essencial já cumprido)"
        onPress={() => setCenario('B')}
      />
      <PrimaryButton
        titulo="Simular estado C (nenhuma tarefa hoje)"
        onPress={() => setCenario('C')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  corpo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
