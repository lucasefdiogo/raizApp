import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { StepDots } from './StepDots';

interface TutorialSlideBotao {
  titulo: string;
  onPress: () => void;
}

interface TutorialSlideProps {
  passoAtual: number;
  totalPassos: number;
  eyebrow?: string;
  titulo: string;
  corpo?: ReactNode;
  rodape?: string;
  botaoPrimario: TutorialSlideBotao;
  botaoSecundario?: TutorialSlideBotao;
  onPular?: () => void;
}

export function TutorialSlide({
  passoAtual,
  totalPassos,
  eyebrow,
  titulo,
  corpo,
  rodape,
  botaoPrimario,
  botaoSecundario,
  onPular,
}: TutorialSlideProps) {
  return (
    <View style={styles.container}>
      {onPular && (
        <Pressable
          accessibilityRole="button"
          onPress={onPular}
          style={styles.pular}
          hitSlop={12}
        >
          <Text style={styles.pularTexto}>pular</Text>
        </Pressable>
      )}

      <View style={styles.conteudo}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.titulo}>{titulo}</Text>
        {corpo && <View style={styles.corpo}>{corpo}</View>}
      </View>

      <View style={styles.rodapeContainer}>
        {rodape && <Text style={styles.rodape}>{rodape}</Text>}
        <StepDots total={totalPassos} atual={passoAtual} />
        <View style={styles.botoes}>
          <PrimaryButton
            titulo={botaoPrimario.titulo}
            onPress={botaoPrimario.onPress}
          />
          {botaoSecundario && (
            <Pressable
              accessibilityRole="button"
              onPress={botaoSecundario.onPress}
              style={styles.botaoSecundario}
            >
              <Text style={styles.botaoSecundarioTexto}>
                {botaoSecundario.titulo}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  pular: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 1,
    padding: theme.spacing.sm,
  },
  pularTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  titulo: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  corpo: {
    marginTop: theme.spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  rodapeContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  rodape: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  botoes: {
    gap: theme.spacing.sm,
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
