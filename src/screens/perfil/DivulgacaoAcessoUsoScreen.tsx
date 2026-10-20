import React, { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useConsentimentoAcessoUso } from '../../hooks/useConsentimentoAcessoUso';
import { useAcessoUso } from '../../hooks/useAcessoUso';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface DivulgacaoAcessoUsoScreenProps {
  uid: string;
  onVoltar: () => void;
}

/**
 * Divulgação do acesso de uso (HU-02, RN-07/RN-10). Estados: normal e
 * sem-permissao (a pessoa voltou das configurações sem conceder). O texto
 * precisa continuar batendo com o que a coleta faz (useColetaUsoApps).
 */
export function DivulgacaoAcessoUsoScreen({
  uid,
  onVoltar,
}: DivulgacaoAcessoUsoScreenProps) {
  const { permitir } = useConsentimentoAcessoUso(uid);
  const { concedido } = useAcessoUso();
  const [abriuConfiguracoes, setAbriuConfiguracoes] = useState(false);
  const [voltou, setVoltou] = useState(false);

  useEffect(() => {
    if (!abriuConfiguracoes) {
      return;
    }
    const subscription = AppState.addEventListener('change', estado => {
      if (estado === 'active') {
        setVoltou(true);
      }
    });
    return () => subscription.remove();
  }, [abriuConfiguracoes]);

  const handlePermitir = async () => {
    setVoltou(false);
    const abriu = await permitir();
    setAbriuConfiguracoes(abriu);
  };

  const semPermissao = voltou && !concedido;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Medir seu tempo nas redes
        </Text>
        <Text style={styles.paragrafo}>
          Para mostrar quanto tempo você passa nas redes sociais, o Rootora usa
          o acesso de uso do Android. Medimos só os apps da lista de redes
          sociais: tempo de uso e quantas vezes cada um foi aberto. Os dados
          ficam na sua conta e são apagados se você excluir a conta.
        </Text>

        {semPermissao && (
          <View style={styles.aviso} accessibilityLiveRegion="polite">
            <Text style={styles.avisoTexto}>
              Acesso de uso desligado. O bloqueio continua funcionando, só sem
              medir o tempo.
            </Text>
          </View>
        )}

        <PrimaryButton
          titulo="Permitir acesso de uso"
          onPress={handlePermitir}
        />
        <SecondaryButton titulo="Agora não" onPress={onVoltar} />
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
  paragrafo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  aviso: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  avisoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
