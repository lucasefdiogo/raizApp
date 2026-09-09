import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useOnboarding } from '../hooks/useOnboarding';
import { ProgressDots } from '../components/ProgressDots';
import { PrimaryButton } from '../components/PrimaryButton';
import { OnboardingStepPorque } from '../components/onboarding/OnboardingStepPorque';
import { OnboardingStepFoco } from '../components/onboarding/OnboardingStepFoco';
import { OnboardingStepTempoTela } from '../components/onboarding/OnboardingStepTempoTela';

interface OnboardingScreenProps {
  uid: string;
  onConcluir: () => void;
}

export function OnboardingScreen({ uid, onConcluir }: OnboardingScreenProps) {
  const {
    passo,
    totalPassos,
    dados,
    podeAvancar,
    salvando,
    definirPorqueTexto,
    definirFoco,
    definirTempoTela,
    avancar,
    voltar,
  } = useOnboarding({ uid, onConcluir });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.conteudo}>
          {passo === 0 && (
            <OnboardingStepPorque
              valor={dados.porqueTexto}
              onAlterar={definirPorqueTexto}
            />
          )}
          {passo === 1 && (
            <OnboardingStepFoco
              valor={dados.focoProcrastinacao}
              onSelecionar={definirFoco}
            />
          )}
          {passo === 2 && (
            <OnboardingStepTempoTela
              valor={dados.tempoTelaEstimado}
              onSelecionar={definirTempoTela}
            />
          )}
        </View>

        <View style={styles.rodape}>
          <ProgressDots total={totalPassos} atual={passo} />
          <View style={styles.botoes}>
            {passo > 0 && (
              <PrimaryButton titulo="Voltar" onPress={voltar} />
            )}
            <PrimaryButton
              titulo={passo === totalPassos - 1 ? 'Concluir' : 'Continuar'}
              onPress={avancar}
              desabilitado={!podeAvancar || salvando}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  rodape: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  botoes: {
    gap: theme.spacing.sm,
  },
});
