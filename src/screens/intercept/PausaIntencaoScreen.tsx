import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface PausaIntencaoScreenProps {
  appLabel: string;
  /** Duração da pausa deste bloco (5/10/20/40/60s — ver duracaoPausaIntencaoSeg). */
  duracaoSeg: number;
  saldo: number;
  onLiberar: (intencao: string) => void;
  onAgoraNao: () => void;
}

/**
 * Pausa antes de liberar cada bloco: pergunta opcional e botão que só
 * habilita ao fim da contagem. O estado é local de propósito — se o usuário
 * sai da tela, a próxima tentativa monta uma instância nova e a contagem
 * recomeça (regra 5). Fricção, não punição: ele pode sair a qualquer
 * momento, e o texto é só o respiro.
 */
export function PausaIntencaoScreen({
  appLabel,
  duracaoSeg,
  saldo,
  onLiberar,
  onAgoraNao,
}: PausaIntencaoScreenProps) {
  const [restante, setRestante] = useState(duracaoSeg);
  const [intencao, setIntencao] = useState('');

  useEffect(() => {
    const intervalo = setInterval(() => {
      setRestante(anterior => Math.max(0, anterior - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const liberado = restante === 0;

  return (
    <View style={styles.conteudo} testID="pausa-intencao">
      <Text style={styles.titulo}>O que você vai fazer agora?</Text>
      <Text style={styles.apoio}>
        Um respiro antes de abrir o {appLabel}.{' '}
        {saldo === 1 ? 'Resta 1 bloco hoje.' : `Restam ${saldo} blocos hoje.`}
      </Text>
      <TextField
        label="Se quiser, escreva (opcional)"
        value={intencao}
        onChangeText={setIntencao}
        returnKeyType="done"
      />
      <View style={styles.acoes}>
        <PrimaryButton
          titulo={liberado ? 'Liberar' : `Liberar em ${restante}s`}
          onPress={() => onLiberar(intencao)}
          desabilitado={!liberado}
        />
        <SecondaryButton titulo="Agora não" onPress={onAgoraNao} />
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
