import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TipoValvula, Valvula } from '../../domain/valvulas';
import { AppChip } from './AppChip';
import { ValvulaRow } from './ValvulaRow';

interface InterceptLayoutProps {
  appIconeBase64: string;
  appNome: string;
  eyebrow: string;
  /** Ausente = sem headline (ex.: EsperaBloqueioScreen no cooldown, onde a própria contagem ocupa esse lugar). */
  headline?: string;
  /** Frase do banco `noturno` (RN05) — Zilla itálico, peso 500. */
  headlineItalico?: boolean;
  /** Conteúdo específico do estado, entre a headline e a ação principal. */
  children?: React.ReactNode;
  acaoPrincipal?: React.ReactNode;
  valvulas?: Valvula[];
  onValvula?: (tipo: TipoValvula) => void;
  /**
   * "Voltar ao início" (RN01). Ausente = o link não aparece — único jeito de
   * saltar a esqueleto (RN12: a respiração de emergência não tem como
   * pular, só o voltar físico cancela).
   */
  onVoltarAoInicio?: () => void;
}

/**
 * Esqueleto único de toda tela do root `Intercept` (HU-11, RN01): chip do
 * app → eyebrow → headline → conteúdo do estado → ação principal →
 * "OUTRAS SAÍDAS" (só com válvulas) → "Voltar ao início". Burro — cada tela
 * decide o que preencher.
 */
export function InterceptLayout({
  appIconeBase64,
  appNome,
  eyebrow,
  headline,
  headlineItalico = false,
  children,
  acaoPrincipal,
  valvulas,
  onValvula,
  onVoltarAoInicio,
}: InterceptLayoutProps) {
  return (
    <ScrollView contentContainerStyle={styles.conteudo} testID="intercept-layout">
      <AppChip iconeBase64={appIconeBase64} nome={appNome} />
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      {headline && (
        <Text style={[styles.headline, headlineItalico && styles.headlineItalico]}>
          {headline}
        </Text>
      )}
      {children}
      {acaoPrincipal}
      {valvulas && valvulas.length > 0 && (
        <View style={styles.valvulas}>
          <Text style={styles.eyebrowValvulas}>OUTRAS SAÍDAS</Text>
          <View style={styles.cartaoValvulas}>
            {valvulas.map(valvula => (
              <ValvulaRow
                key={valvula.tipo}
                valvula={valvula}
                onPress={() => onValvula?.(valvula.tipo)}
              />
            ))}
          </View>
        </View>
      )}
      {onVoltarAoInicio && (
        <Pressable
          accessibilityRole="button"
          onPress={onVoltarAoInicio}
          hitSlop={8}
          style={styles.alvo}
        >
          <Text style={styles.link}>Voltar ao início</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  headlineItalico: {
    fontFamily: theme.typography.fontFamily.heading,
    fontStyle: 'italic',
  },
  valvulas: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  eyebrowValvulas: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  cartaoValvulas: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  alvo: {
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
