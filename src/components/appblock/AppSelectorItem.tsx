import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface AppSelectorItemProps {
  nome: string;
  /** Data URI PNG (ver AccessibilityDetection.getInstalledApps) ou null. */
  icone: string | null;
  selecionado: boolean;
  onToggle: () => void;
}

/**
 * Linha de app na lista de seleção. Componente burro: só recebe o que já
 * vem pronto do hook. Checkbox no mesmo estilo visual usado em TaskItem/
 * AddTaskForm — não é um Switch nativo, pra não competir com o toque na
 * linha inteira.
 */
export function AppSelectorItem({
  nome,
  icone,
  selecionado,
  onToggle,
}: AppSelectorItemProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selecionado }}
      accessibilityLabel={nome}
      onPress={onToggle}
      style={styles.linha}
    >
      {icone ? (
        <Image source={{ uri: icone }} style={styles.icone} />
      ) : (
        <View style={styles.iconePlaceholder} />
      )}
      <Text style={styles.nome} numberOfLines={1}>
        {nome}
      </Text>
      <View
        style={[styles.checkbox, selecionado && styles.checkboxMarcado]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
  },
  iconePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.border,
  },
  nome: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  checkboxMarcado: {
    backgroundColor: theme.colors.musgo,
  },
});
