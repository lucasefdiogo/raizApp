import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ListChecks, Timer, Wind, Zap } from 'lucide-react-native';
import { theme } from '../../theme';
import { TipoValvula, Valvula } from '../../domain/valvulas';

interface ValvulaRowProps {
  valvula: Valvula;
  onPress: () => void;
}

const ICONES: Record<TipoValvula, React.ComponentType<{ size: number; color: string }>> = {
  acesso_rapido: Zap,
  emergencia: Wind,
  sessao_foco: Timer,
  tarefas_extras: ListChecks,
};

/**
 * Linha de "OUTRAS SAÍDAS" (HU-11, RN02) — disponível é tocável, indisponível
 * é só leitura (ícone/borda/título esmaecidos em Terra Suave, nunca Cobre).
 * `domain/valvulas.ts` já garante que a descrição/meta nunca usam negativa.
 */
export function ValvulaRow({ valvula, onPress }: ValvulaRowProps) {
  const Icone = ICONES[valvula.tipo];
  const conteudo = (
    <View style={styles.linha}>
      <View style={[styles.icone, !valvula.disponivel && styles.iconeEsmaecido]}>
        <Icone size={18} color={valvula.disponivel ? theme.colors.musgo : theme.colors.terraSuave} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.titulo, !valvula.disponivel && styles.textoEsmaecido]}>
          {valvula.titulo}
        </Text>
        <Text style={styles.descricao}>{valvula.descricao}</Text>
      </View>
      {valvula.meta !== '' && (
        <Text testID="valvula-meta" style={styles.meta}>
          {valvula.meta}
        </Text>
      )}
    </View>
  );

  if (!valvula.disponivel) {
    return <View style={styles.linhaContainer}>{conteudo}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${valvula.titulo}. ${valvula.descricao}`}
      onPress={onPress}
      style={({ pressed }) => [styles.linhaContainer, pressed && styles.pressionado]}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linhaContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  pressionado: {
    opacity: 0.7,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.musgo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeEsmaecido: {
    borderColor: theme.colors.terraSuave,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  textoEsmaecido: {
    color: theme.colors.terraSuave,
  },
  descricao: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  meta: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
});
