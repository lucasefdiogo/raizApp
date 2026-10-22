import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ReflexaoSemanalDados } from '../../domain/resumoRedes';
import { PrimaryButton } from '../PrimaryButton';

interface ReflexaoSemanalSheetProps {
  visible: boolean;
  dados: ReflexaoSemanalDados;
  onEntendi: () => void;
  onAgoraNao: () => void;
}

/**
 * Reflexão da semana (HU-08, RN10) — só fatos da semana anterior, sem
 * nenhuma proposta de desafio ou meta (RN11: fora do escopo até decisão
 * própria). Componente burro: quem decide SE e QUANDO mostrar é
 * ProgressoScreen (uma vez por semana, via AsyncStorage).
 */
export function ReflexaoSemanalSheet({
  visible,
  dados,
  onEntendi,
  onAgoraNao,
}: ReflexaoSemanalSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAgoraNao}>
      <Pressable style={styles.fundo} onPress={onAgoraNao}>
        <Pressable
          style={[styles.cartao, { paddingBottom: theme.spacing.xl + insets.bottom }]}
          onPress={() => {}}
        >
          <Text style={styles.eyebrow}>{dados.periodoLabel}</Text>
          <Text style={styles.titulo}>Sua semana nas redes</Text>
          <Text style={styles.paragrafo}>
            {dados.duracaoTotal} no total.
            {dados.appPrincipalTexto ? ` ${dados.appPrincipalTexto}` : ''}
          </Text>

          <View style={styles.contadores}>
            <View style={styles.contador}>
              <Text style={styles.contadorNumero}>{dados.mediaPorDia}</Text>
              <Text style={styles.contadorRotulo}>média por dia</Text>
            </View>
            <View style={styles.contador}>
              <Text style={styles.contadorNumero}>{dados.diaMaisLongoAbreviado ?? '—'}</Text>
              <Text style={styles.contadorRotulo}>dia mais longo</Text>
            </View>
            <View style={styles.contador}>
              <Text style={styles.contadorNumero}>{dados.totalAberturas}</Text>
              <Text style={styles.contadorRotulo}>aberturas</Text>
            </View>
          </View>

          <PrimaryButton titulo="Entendi" onPress={onEntendi} />
          <Pressable
            accessibilityRole="button"
            onPress={onAgoraNao}
            hitSlop={8}
            style={styles.linkAgoraNao}
          >
            <Text style={styles.linkAgoraNaoTexto}>Agora não</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  cartao: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  paragrafo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  contadores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  contador: {
    alignItems: 'center',
  },
  contadorNumero: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  contadorRotulo: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  linkAgoraNao: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  linkAgoraNaoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
