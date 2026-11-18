import React, { useEffect, useRef } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import {
  abrirRootora,
  encerrarMomentoFocoNaInterceptacao,
  irParaTelaInicial,
} from '../../native/AccessibilityDetection';
import { theme } from '../../theme';

export function MomentoFocoInterceptScreen({ fimEm }: { fimEm: number }) {
  const fechadoRef = useRef(false);

  useEffect(() => {
    const fecharSeExpirou = () => {
      if (Date.now() >= fimEm && !fechadoRef.current) {
        fechadoRef.current = true;
        BackHandler.exitApp();
      }
    };
    fecharSeExpirou();
    const timeout = setTimeout(fecharSeExpirou, Math.max(0, fimEm - Date.now()));
    const appState = AppState.addEventListener('change', estado => {
      if (estado === 'active') fecharSeExpirou();
    });
    return () => { clearTimeout(timeout); appState.remove(); };
  }, [fimEm]);
  async function voltarParaTarefa() {
    await abrirRootora();
    BackHandler.exitApp();
  }

  async function encerrar() {
    encerrarMomentoFocoNaInterceptacao();
    await irParaTelaInicial();
    BackHandler.exitApp();
  }

  return (
    <SafeAreaView style={styles.container} testID="momento-foco-intercept">
      <View style={styles.conteudo}>
        <Text style={styles.titulo}>Seu momento de foco está em andamento</Text>
        <Text style={styles.descricao}>
          Você escolheu fazer uma pausa neste app. Pode voltar à tarefa ou encerrar o momento de foco.
        </Text>
        <PrimaryButton titulo="Voltar à tarefa" onPress={voltarParaTarefa} />
        <SecondaryButton titulo="Encerrar momento de foco" onPress={encerrar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  titulo: {
    fontFamily: theme.typography.fontFamily.headingBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  descricao: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
