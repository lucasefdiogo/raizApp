import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppInstalado } from '../../native/AccessibilityDetection';

interface AppListItemProps {
  app: AppInstalado;
  selecionado: boolean;
  onToggle: () => void;
}

/**
 * Linha da lista de seleção de apps — ícone (base64 do PackageManager via
 * `<queries>`, ver RootoraAccessibilityModule.listarAppsInstalados) + nome +
 * indicador de seleção. Sem Switch nativo de propósito (quebra em testes
 * Jest quando roda depois de um LoadingIndicator no mesmo arquivo).
 */
export function AppListItem({ app, selecionado, onToggle }: AppListItemProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selecionado }}
      accessibilityLabel={app.nome}
      onPress={onToggle}
      style={({ pressed }) => [styles.linha, pressed && styles.linhaPressionada]}
    >
      <Image
        source={{ uri: `data:image/png;base64,${app.iconeBase64}` }}
        style={styles.icone}
      />
      <Text style={styles.nome} numberOfLines={1}>
        {app.nome}
      </Text>
      <View style={[styles.marcador, selecionado && styles.marcadorSelecionado]}>
        {selecionado && <View style={styles.marcadorPreenchido} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  linhaPressionada: {
    opacity: 0.7,
  },
  icone: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
  },
  nome: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  marcador: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorSelecionado: {
    borderColor: theme.colors.cobre,
  },
  marcadorPreenchido: {
    width: 12,
    height: 12,
    borderRadius: theme.radius.sm / 2,
    backgroundColor: theme.colors.cobre,
  },
});
