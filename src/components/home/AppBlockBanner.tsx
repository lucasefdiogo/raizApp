import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

interface AppBlockBannerProps {
  onConfigurar: () => void;
  onDispensar: () => void;
}

/**
 * Descoberta antecipada do bloqueio de apps — aparece na Home só pra quem
 * nunca configurou nenhum app (ver useAppBlockConfig.configAtual). Fundo
 * Musgo faz o Cobre do botão ser a única cor de destaque aqui; eyebrow em
 * Areia clara em vez de Cobre, pra não repetir Cobre duas vezes na mesma
 * peça. Componente burro: não decide a condição de exibição nem persiste
 * o dispensar — quem chama decide isso (ver useAppBlockBannerDismissido).
 */
export function AppBlockBanner({
  onConfigurar,
  onDispensar,
}: AppBlockBannerProps) {
  return (
    <View style={styles.container} testID="app-block-banner">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dispensar"
        onPress={onDispensar}
        hitSlop={10}
        style={styles.fechar}
      >
        <X size={16} color={theme.colors.areiaClara} />
      </Pressable>

      <Text style={styles.eyebrow}>Novo · Bloqueio de apps</Text>
      <Text style={styles.corpo}>
        Use suas tarefas do dia para desbloquear Instagram, TikTok e outros
        apps que mais tiram seu foco.
      </Text>
      <PrimaryButton titulo="Configurar agora" onPress={onConfigurar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.musgo,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  fechar: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.areiaClara,
    paddingRight: theme.spacing.xl,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.areia,
  },
});
