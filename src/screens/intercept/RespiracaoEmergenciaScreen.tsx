import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface RespiracaoEmergenciaScreenProps {
  /** Duração da respiração guiada, em segundos (60 na emergência). */
  duracaoSeg: number;
  /** Chamado uma vez, ao zerar. Não há como pular antes. */
  onConcluir: () => void;
}

function formatar(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Respiração guiada da saída de emergência: só contagem, sem botão de pular. */
export function RespiracaoEmergenciaScreen({
  duracaoSeg,
  onConcluir,
}: RespiracaoEmergenciaScreenProps) {
  const [restante, setRestante] = useState(duracaoSeg);

  useEffect(() => {
    if (restante <= 0) {
      onConcluir();
      return;
    }
    const id = setTimeout(() => setRestante(restante - 1), 1000);
    return () => clearTimeout(id);
    // onConcluir muda a cada render do pai; só o contador dispara o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  return (
    <View style={styles.conteudo} testID="respiracao-emergencia">
      <Text style={styles.titulo} accessibilityRole="header">
        Respire um instante
      </Text>
      <Text style={styles.apoio}>
        {`Em ${duracaoSeg} segundos, os 2 minutos liberam.`}
      </Text>
      <View style={styles.circulo} importantForAccessibility="no-hide-descendants" />
      <Text
        style={styles.contagem}
        testID="respiracao-contagem"
        accessibilityRole="timer"
        accessibilityLabel={`Faltam ${restante} ${restante === 1 ? 'segundo' : 'segundos'}`}
        accessibilityLiveRegion="polite"
      >
        {formatar(restante)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  apoio: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  circulo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.areia,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  contagem: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textPrimary,
  },
});
