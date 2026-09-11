import React, { useEffect } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { PASSO_ONBOARDING } from '../domain/onboarding';
import { useOnboarding } from '../hooks/useOnboarding';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { ProgressDots } from '../components/ProgressDots';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
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
    carregando,
    definirPorqueTexto,
    definirFoco,
    definirTempoTela,
    avancar,
    voltar,
  } = useOnboarding({ uid, onConcluir });

  // Sem isso, o botão físico voltar fecha o app inteiro nos passos 2 e 3
  // em vez de retroceder um passo — o app "sumindo" no meio do onboarding.
  // No passo 1 (nada antes) deixa o comportamento padrão do Android agir.
  useEffect(() => {
    if (passo <= PASSO_ONBOARDING.foco) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        voltar();
        return true;
      },
    );
    return () => subscription.remove();
  }, [passo, voltar]);

  const mostrarAvisoPorque =
    passo === PASSO_ONBOARDING.porque &&
    dados.porqueTexto.trim().length > 0 &&
    !podeAvancar;

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.conteudo}>
          {passo === PASSO_ONBOARDING.foco && (
            <OnboardingStepFoco
              valor={dados.focoProcrastinacao}
              onSelecionar={definirFoco}
            />
          )}
          {passo === PASSO_ONBOARDING.tempoTela && (
            <OnboardingStepTempoTela
              valor={dados.tempoTelaEstimado}
              onSelecionar={definirTempoTela}
            />
          )}
          {passo === PASSO_ONBOARDING.porque && (
            <OnboardingStepPorque
              valor={dados.porqueTexto}
              onAlterar={definirPorqueTexto}
            />
          )}
          {mostrarAvisoPorque && (
            <Text style={styles.aviso}>Escreva um pouco mais sobre isso</Text>
          )}
        </View>

        <View style={styles.rodape}>
          <ProgressDots total={totalPassos} atual={passo} />
          <View style={styles.botoes}>
            {passo > PASSO_ONBOARDING.foco && (
              <View style={styles.botaoFlex}>
                <SecondaryButton titulo="Voltar" onPress={voltar} />
              </View>
            )}
            <View style={styles.botaoFlex}>
              <PrimaryButton
                titulo={passo === totalPassos - 1 ? 'Concluir' : 'Continuar'}
                onPress={avancar}
                desabilitado={!podeAvancar || salvando}
              />
            </View>
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
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  botaoFlex: {
    flex: 1,
  },
  aviso: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
