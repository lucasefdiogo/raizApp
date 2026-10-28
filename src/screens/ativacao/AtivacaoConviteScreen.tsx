import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { logAtivacaoBloqueioConvite } from '../../services/analytics';

interface AtivacaoConviteScreenProps {
  aoConfigurar: () => void;
  aoPular: () => void;
}

/**
 * Convite pra ativar o bloqueio logo depois do onboarding — par da
 * NotificationPrimingScreen, mesmo padrão visual. Componente burro: uid,
 * hookup com useAtivacaoBloqueio e a decisão de quando exibir vivem no
 * ponto de entrada do boot (RootNavigator).
 */
export function AtivacaoConviteScreen({
  aoConfigurar,
  aoPular,
}: AtivacaoConviteScreenProps) {
  function handleConfigurar() {
    logAtivacaoBloqueioConvite('configurar');
    aoConfigurar();
  }

  function handlePular() {
    logAtivacaoBloqueioConvite('agora_nao');
    aoPular();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.conteudo}>
        <Text style={styles.titulo}>Agora, o bloqueio das redes</Text>
        <Text style={styles.introducao}>
          Pra pausar antes de abrir as redes que mais tiram seu foco, o
          Rootora precisa que você escolha os apps e ative a permissão de
          acessibilidade.
        </Text>
      </View>

      <View style={styles.rodape}>
        <PrimaryButton
          titulo="Configurar bloqueio"
          onPress={handleConfigurar}
        />
        <SecondaryButton titulo="Agora não" onPress={handlePular} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  introducao: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  rodape: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
