import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

const DIAS = [
  { valor: 0, letra: 'D', rotulo: 'domingo' },
  { valor: 1, letra: 'S', rotulo: 'segunda' },
  { valor: 2, letra: 'T', rotulo: 'terça' },
  { valor: 3, letra: 'Q', rotulo: 'quarta' },
  { valor: 4, letra: 'Q', rotulo: 'quinta' },
  { valor: 5, letra: 'S', rotulo: 'sexta' },
  { valor: 6, letra: 'S', rotulo: 'sábado' },
] as const;

interface SeletorDiasSemanaProps {
  diasSelecionados: number[];
  onToggleDia: (dia: number) => void;
}

/** Multi-seleção dos dias da semana da janela de bloqueio. 0 = domingo (Date.getDay()). */
export function SeletorDiasSemana({ diasSelecionados, onToggleDia }: SeletorDiasSemanaProps) {
  return (
    <View style={styles.linha}>
      {DIAS.map(dia => {
        const selecionado = diasSelecionados.includes(dia.valor);
        return (
          <Pressable
            key={dia.valor}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selecionado }}
            accessibilityLabel={dia.rotulo}
            onPress={() => onToggleDia(dia.valor)}
            style={[styles.dia, selecionado && styles.diaSelecionado]}
          >
            <Text style={[styles.texto, selecionado && styles.textoSelecionado]}>
              {dia.letra}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  dia: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaSelecionado: {
    backgroundColor: theme.colors.cobre,
    borderColor: theme.colors.cobre,
  },
  texto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  textoSelecionado: {
    color: theme.colors.casca,
  },
});
