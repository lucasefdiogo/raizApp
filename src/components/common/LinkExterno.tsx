import React from 'react';
import { Linking, StyleSheet, Text, TextProps } from 'react-native';
import { theme } from '../../theme';

interface LinkExternoProps extends TextProps {
  /** URL absoluta a abrir no navegador do dispositivo. */
  url: string;
  children: React.ReactNode;
}

/**
 * Texto tocável que abre uma URL FORA do app, no navegador do dispositivo
 * (Linking.openURL) — usado para os documentos legais. Componente burro: só
 * recebe url + conteúdo. Falha ao abrir é silenciosa (nada a fazer do lado
 * do app se não houver navegador).
 */
export function LinkExterno({
  url,
  children,
  style,
  ...resto
}: LinkExternoProps) {
  return (
    <Text
      accessibilityRole="link"
      onPress={() => {
        Linking.openURL(url).catch(() => {});
      }}
      style={[styles.link, style]}
      {...resto}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgo,
    textDecorationLine: 'underline',
  },
});
