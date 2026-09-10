import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useBlockHardwareBack } from '../../hooks/useBlockHardwareBack';
import { RecoveryStateCard } from '../../components/recovery/RecoveryStateCard';
import { PrimaryButton } from '../../components/PrimaryButton';

interface RecoveryStateScreenProps {
  tipo: 'escudo' | 'reduzido';
  corpo: string;
  onConcluir: () => void;
}

export function RecoveryStateScreen({
  tipo,
  corpo,
  onConcluir,
}: RecoveryStateScreenProps) {
  // Não dá pra pular esse fluxo pelo botão voltar — ver princípio de
  // recaída sem vergonha no CLAUDE.md.
  useBlockHardwareBack();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.conteudo}>
        <RecoveryStateCard tipo={tipo} corpo={corpo} />
      </View>
      <PrimaryButton titulo="Ver tarefas de hoje" onPress={onConcluir} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  conteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
