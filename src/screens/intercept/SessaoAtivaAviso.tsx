import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { formatarContagemMs } from '../../domain/saldoBloqueio';

interface SessaoAtivaAvisoProps {
  /** Ms que faltam à sessão ativa. */
  msRestantes: number;
  /** Faltando 1 minuto ou menos: mostra o aviso não bloqueante. */
  avisoUmMinuto: boolean;
}

/**
 * Tempo restante da sessão ativa e o aviso "1 minuto restante". Só props:
 * quem decide o que mostrar é o hook. O texto lido pelo leitor de tela muda
 * por minuto (não por segundo), para a região viva não falar sem parar.
 */
export function SessaoAtivaAviso({
  msRestantes,
  avisoUmMinuto,
}: SessaoAtivaAvisoProps) {
  const minutos = Math.ceil(Math.max(0, msRestantes) / 60_000);
  const textoAcessivel =
    minutos <= 1
      ? 'Tempo restante da sessão: menos de 1 minuto'
      : `Tempo restante da sessão: ${minutos} minutos`;

  return (
    <View style={styles.conteudo} testID="sessao-ativa-aviso">
      <Text style={styles.rotulo}>Tempo livre</Text>
      <Text
        style={styles.tempo}
        testID="sessao-tempo"
        accessibilityRole="timer"
        accessibilityLabel={textoAcessivel}
        accessibilityLiveRegion="polite"
      >
        {formatarContagemMs(msRestantes)}
      </Text>
      <Text style={styles.apoio}>Contando só enquanto o app está na tela.</Text>
      {avisoUmMinuto && (
        <View
          style={styles.aviso}
          testID="sessao-aviso"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.avisoTexto}>1 minuto restante</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rotulo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tempo: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  apoio: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  aviso: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  avisoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
