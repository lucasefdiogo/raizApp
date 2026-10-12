import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface TempoEsgotadoScreenProps {
  toleranciaMin: number;
  /** false = a tolerância deste bloco já foi usada (ou está desligada): só resta sair. */
  podeTolerancia: boolean;
  onTolerancia: () => void;
  onAgoraNao: () => void;
}

/** Fim do bloco: oferece UMA tolerância por bloco, sem acúmulo. */
export function TempoEsgotadoScreen({
  toleranciaMin,
  podeTolerancia,
  onTolerancia,
  onAgoraNao,
}: TempoEsgotadoScreenProps) {
  return (
    <View style={styles.conteudo} testID="tempo-esgotado">
      <Text style={styles.titulo}>Tempo esgotado</Text>
      <Text style={styles.apoio}>
        {podeTolerancia
          ? 'O bloco terminou. Se precisar, dá para finalizar o que estava fazendo.'
          : 'O bloco terminou.'}
      </Text>
      <View style={styles.acoes}>
        {podeTolerancia && (
          <PrimaryButton
            titulo={`+${toleranciaMin} min para finalizar`}
            onPress={onTolerancia}
          />
        )}
        <SecondaryButton
          titulo={podeTolerancia ? 'Agora não' : 'Sair'}
          onPress={onAgoraNao}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'center',
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
  acoes: {
    gap: theme.spacing.md,
  },
});
