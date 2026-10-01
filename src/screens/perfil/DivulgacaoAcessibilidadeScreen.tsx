import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useConsentimentoAcessibilidade } from '../../hooks/useConsentimentoAcessibilidade';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface DivulgacaoAcessibilidadeScreenProps {
  uid: string;
  onVoltar: () => void;
}

/**
 * Divulgação em destaque do Accessibility Service (política da Play
 * Store) — mostrada ao tocar "Ativar" na tela de bloqueio de apps, ANTES
 * de abrir as configurações do Android. Tela própria, fora de qualquer
 * menu, separada de qualquer outra divulgação de dados do app. O texto
 * abaixo precisa continuar batendo com o que o código de fato faz com os
 * dados (ver accessibility_service_config.xml e
 * RootoraAccessibilityService.kt) — qualquer mudança no serviço que
 * invalide uma destas frases exige atualizar as duas juntas.
 */
export function DivulgacaoAcessibilidadeScreen({
  uid,
  onVoltar,
}: DivulgacaoAcessibilidadeScreenProps) {
  const { concordarEAtivar } = useConsentimentoAcessibilidade(uid);

  const handleConcordar = async () => {
    // Em falha (toast já disparado pelo hook), fica na tela pra permitir
    // tentar de novo — só volta quando o consentimento foi mesmo gravado.
    const sucesso = await concordarEAtivar();
    if (sucesso) {
      onVoltar();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Como o bloqueio funciona</Text>
        <Text style={styles.paragrafo}>
          Para interceptar um app, o Rootora usa o serviço de acessibilidade do Android.
        </Text>
        <Text style={styles.paragrafo}>
          Ele identifica apenas qual app foi aberto, para mostrar sua tarefa do dia no lugar
          dele.
        </Text>
        <Text style={styles.paragrafo}>
          Não lê o que você digita e não vê o conteúdo das telas.
        </Text>
        <Text style={styles.paragrafo}>
          O Rootora registra quais apps foram interceptados e quando.
        </Text>

        <PrimaryButton titulo="Concordo e quero ativar" onPress={handleConcordar} />
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
});
