import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useConsentimentoAcessibilidade } from '../../hooks/useConsentimentoAcessibilidade';
import { useAccessibilityPermission } from '../../hooks/useAccessibilityPermission';
import { openAccessibilitySettings } from '../../native/AccessibilityDetection';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';

interface DivulgacaoAcessibilidadeScreenProps {
  uid: string;
  onVoltar: () => void;
}

const BLOCOS = [
  {
    eyebrow: 'O que ele vê',
    texto: 'Ele identifica apenas qual app foi aberto, para mostrar sua tarefa do dia no lugar dele.',
  },
  {
    eyebrow: 'O que ele não vê',
    texto: 'Não lê o que você digita e não vê o conteúdo das telas.',
  },
  {
    eyebrow: 'O que fica registrado',
    texto: 'O Rootora registra quais apps foram interceptados e quando.',
  },
] as const;

/**
 * Divulgação em destaque do Accessibility Service (política da Play
 * Store) — também reaproveitada como tela explicativa pra quem já tem o
 * serviço ativo ("Saiba o que é" em BloqueioAppsScreen). O layout muda
 * conforme o status REAL do serviço (useAccessibilityPermission, não
 * parâmetro de rota) — assim um usuário que desativa o serviço pelo
 * Android enquanto essa tela está aberta (AppState 'active' reavalia)
 * ou que chega aqui logo depois de mudar o estado sempre vê a versão
 * certa. O texto comum aos dois estados precisa continuar batendo com o
 * que o código de fato faz com os dados (ver
 * accessibility_service_config.xml e RootoraAccessibilityService.kt) —
 * qualquer mudança no serviço que invalide uma destas frases exige
 * atualizar as duas juntas.
 */
export function DivulgacaoAcessibilidadeScreen({
  uid,
  onVoltar,
}: DivulgacaoAcessibilidadeScreenProps) {
  const { concordarEAtivar } = useConsentimentoAcessibilidade(uid);
  const { ativo, carregando } = useAccessibilityPermission();

  const handleConcordar = async () => {
    const sucesso = await concordarEAtivar();
    if (sucesso) {
      onVoltar();
    }
  };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        {ativo && (
          <View style={styles.selo}>
            <View style={styles.seloPonto} />
            <Text style={styles.seloTexto}>ATIVO</Text>
          </View>
        )}

        <Text style={styles.titulo}>Como o bloqueio funciona</Text>
        <Text style={styles.paragrafo}>
          Para interceptar um app, o Rootora usa o serviço de acessibilidade do Android.
        </Text>

        <View style={styles.card}>
          {BLOCOS.map((bloco, indice) => (
            <React.Fragment key={bloco.eyebrow}>
              {indice > 0 && <View style={styles.divisoria} />}
              <View style={styles.bloco}>
                <Text style={styles.eyebrow}>{bloco.eyebrow.toUpperCase()}</Text>
                <Text style={styles.blocoTexto}>{bloco.texto}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {ativo ? (
          <>
            <Text style={styles.paragrafo}>
              Você pode desativar quando quiser, nas configurações de acessibilidade do
              Android. Sem ele, os apps deixam de ser interceptados.
            </Text>
            <PrimaryButton titulo="Entendi" onPress={onVoltar} />
            <Text
              accessibilityRole="button"
              style={styles.link}
              onPress={openAccessibilitySettings}
            >
              Abrir configurações do Android
            </Text>
          </>
        ) : (
          <>
            <PrimaryButton titulo="Concordo e quero ativar" onPress={handleConcordar} />
            <SecondaryButton titulo="Agora não" onPress={onVoltar} />
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
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  seloPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.musgo,
  },
  seloTexto: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.musgo,
    letterSpacing: 0.5,
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  bloco: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  divisoria: {
    height: 1,
    backgroundColor: theme.colors.terraSuave,
    opacity: 0.25,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  blocoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    textAlignVertical: 'center',
  },
});
