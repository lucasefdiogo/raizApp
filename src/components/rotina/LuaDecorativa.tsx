import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

const TAMANHO = 64;

/** Crescent moon from the night prototype; purely decorative, hidden from screen readers. */
export function LuaDecorativa() {
  return (
    <View
      style={styles.lua}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.sombra} />
    </View>
  );
}

const styles = StyleSheet.create({
  lua: {
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    backgroundColor: theme.colors.musgo,
    overflow: 'hidden',
  },
  sombra: {
    position: 'absolute',
    top: -TAMANHO * 0.1,
    left: -TAMANHO * 0.25,
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    backgroundColor: theme.colors.casca,
  },
});
