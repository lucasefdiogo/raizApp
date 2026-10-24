import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

interface ToggleIndicatorProps {
  ativo: boolean;
}

/**
 * Parte visual (trilho + bolinha) de um toggle — não é tocável por si só,
 * quem decide a área de toque é quem renderiza (um `Pressable` em volta,
 * geralmente a linha inteira). Não o `Switch` nativo — ver
 * reference_switch_loadingindicator_flatlist_jest na memória do projeto:
 * `Switch` quebra em testes que rodam depois de um `LoadingIndicator` no
 * mesmo arquivo.
 */
export function ToggleIndicator({ ativo }: ToggleIndicatorProps) {
  return (
    <View style={[styles.trilha, ativo && styles.trilhaAtiva]}>
      <View style={[styles.bolinha, ativo && styles.bolinhaAtiva]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trilha: {
    width: 44,
    height: 26,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  // Musgo, não Cobre — o toggle nunca deve ser o único Cobre de uma tela.
  trilhaAtiva: {
    backgroundColor: theme.colors.musgo,
  },
  bolinha: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.casca,
  },
  bolinhaAtiva: {
    alignSelf: 'flex-end',
  },
});
