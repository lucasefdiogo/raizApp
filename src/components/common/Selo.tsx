import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface SeloProps {
  texto: string;
  ativo: boolean;
}

/**
 * Pill "ponto + texto" pra status binário (ex: serviço de acessibilidade
 * ATIVO/DESATIVADO) — único componente pra isso, pra não divergir visualmente
 * entre as telas que mostram o mesmo dado (ver DivulgacaoAcessibilidadeScreen
 * e BloqueioAppsScreen).
 */
export function Selo({ texto, ativo }: SeloProps) {
  return (
    <View style={styles.selo}>
      <View style={[styles.ponto, ativo ? styles.pontoAtivo : styles.pontoInativo]} />
      <Text style={[styles.texto, ativo ? styles.textoAtivo : styles.textoInativo]}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pontoAtivo: {
    backgroundColor: theme.colors.musgo,
  },
  pontoInativo: {
    backgroundColor: theme.colors.terraSuave,
  },
  texto: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    letterSpacing: 0.5,
  },
  textoAtivo: {
    color: theme.colors.musgo,
  },
  textoInativo: {
    color: theme.colors.terraSuave,
  },
});
