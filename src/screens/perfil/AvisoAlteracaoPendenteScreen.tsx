import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { RootProgressIcon } from '../../components/RootProgressIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface AvisoAlteracaoPendenteScreenProps {
  /** Resumo (`resumoRegrasBloqueio`) das regras vigentes — o que continua valendo hoje. */
  resumoVigente: string;
  /** Resumo da configuração que o usuário acabou de montar — o que passa a valer amanhã. */
  resumoNovo: string;
  /** Grava de fato a alteração como pendente. */
  onConfirmar: () => void;
  /** Volta pra edição sem salvar nada. */
  onRevisar: () => void;
}

/**
 * Mostrada ao tocar "Salvar" em BloqueioAppsScreen sempre que a alteração
 * vai virar pendente (regra única — qualquer mudança depois da primeira
 * configuração, inclusive desativar, só vale amanhã; ver
 * decidirGravacaoRegrasBloqueio em domain/appBlock.ts). Não é uma rota de
 * navegação separada — BloqueioAppsScreen renderiza este componente no
 * lugar da lista enquanto `mostrarAvisoPendente` está ativo, com acesso
 * direto ao `salvar` já carregado (evita duplicar a leitura de
 * regrasVigentes/appsInstalados numa tela nova).
 */
export function AvisoAlteracaoPendenteScreen({
  resumoVigente,
  resumoNovo,
  onConfirmar,
  onRevisar,
}: AvisoAlteracaoPendenteScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <RootProgressIcon variant="reduzido" tamanho={72} />

        <Text style={styles.titulo}>A mudança vale a partir de amanhã</Text>
        <Text style={styles.paragrafo}>
          Se a vontade de soltar o bloqueio apareceu agora, isso é só o momento falando — não
          precisa se cobrar por isso.
        </Text>
        <Text style={styles.paragrafo}>
          Pra evitar decisões no calor da hora, qualquer alteração nas regras de bloqueio só
          começa a valer no dia seguinte.
        </Text>

        <Text style={styles.rotuloResumo}>Hoje continua</Text>
        <Text style={styles.resumo}>{resumoVigente}</Text>

        <Text style={styles.rotuloResumo}>A partir de amanhã</Text>
        <Text style={styles.resumo}>{resumoNovo}</Text>

        <PrimaryButton titulo="Entendi, confirmar" onPress={onConfirmar} />
        <SecondaryButton titulo="Voltar e revisar" onPress={onRevisar} />
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
    alignItems: 'center',
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  paragrafo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  rotuloResumo: {
    alignSelf: 'flex-start',
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: theme.spacing.sm,
  },
  resumo: {
    alignSelf: 'flex-start',
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
});
