import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface AppBlockStatusCardApp {
  nome: string;
  /** Data URI PNG (ver AccessibilityDetection.getInstalledApps) ou null. */
  icone: string | null;
}

interface AppBlockStatusCardProps {
  apps: AppBlockStatusCardApp[];
  ativoAgora: boolean;
  horarioInicio: string;
  horarioFim: string;
}

/**
 * Status do bloqueio de apps já configurado, na Home — só pra quem já
 * selecionou pelo menos 1 app (mutuamente exclusivo com AppBlockBanner).
 * Componente burro: não resolve nome/ícone (isso já vem pronto via
 * useAppBlockConfig.appsInstalados, cacheado) nem calcula ativoAgora (ver
 * domain/appBlock.estaDentroDaJanelaDeHorario). Nunca afirma "ativo" fora
 * da janela de horário — texto neutro em vez disso.
 */
export function AppBlockStatusCard({
  apps,
  ativoAgora,
  horarioInicio,
  horarioFim,
}: AppBlockStatusCardProps) {
  return (
    <View style={styles.container} testID="app-block-status-card">
      {ativoAgora ? (
        <View style={styles.linhaStatus}>
          <View style={styles.pontoAtivo} />
          <Text style={styles.textoAtivo}>ativo até {horarioFim}</Text>
        </View>
      ) : (
        <Text style={styles.textoNeutro}>
          Bloqueio começa às {horarioInicio}
        </Text>
      )}

      <View style={styles.chips}>
        {apps.map(app => (
          <View key={app.nome} style={styles.chip}>
            {app.icone ? (
              <Image source={{ uri: app.icone }} style={styles.chipIcone} />
            ) : (
              <View style={styles.chipIconePlaceholder} />
            )}
            <Text style={styles.chipTexto} numberOfLines={1}>
              {app.nome}
            </Text>
          </View>
        ))}
      </View>

      {ativoAgora && (
        <Text style={styles.reforco}>
          Se sua tarefa essencial já estiver concluída, o desbloqueio é
          imediato ao abrir um desses apps.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  linhaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pontoAtivo: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.cobre,
  },
  textoAtivo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  textoNeutro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.areia,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    maxWidth: '100%',
  },
  chipIcone: {
    width: 18,
    height: 18,
    borderRadius: theme.radius.sm,
  },
  chipIconePlaceholder: {
    width: 18,
    height: 18,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.border,
  },
  chipTexto: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  reforco: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
