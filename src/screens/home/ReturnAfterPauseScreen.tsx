import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useReturnAfterPause } from '../../hooks/useReturnAfterPause';
import { useBlockHardwareBack } from '../../hooks/useBlockHardwareBack';
import { ReturnAfterPauseCard } from '../../components/return/ReturnAfterPauseCard';

interface ReturnAfterPauseScreenProps {
  uid: string;
  onConcluir: () => void;
}

const ERRO_ENVIO = 'Não deu pra salvar agora. Tenta de novo em instantes.';

export function ReturnAfterPauseScreen({
  uid,
  onConcluir,
}: ReturnAfterPauseScreenProps) {
  // Não dá pra pular esse fluxo pelo botão voltar — ver princípio de
  // recaída sem vergonha no CLAUDE.md.
  useBlockHardwareBack();

  const { porqueTexto, corpoComTexto, enviarTarefaInicial } =
    useReturnAfterPause(uid);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (titulo: string) => {
      setEnviando(true);
      setErro(null);
      try {
        await enviarTarefaInicial(titulo);
        onConcluir();
      } catch {
        setErro(ERRO_ENVIO);
      } finally {
        setEnviando(false);
      }
    },
    [enviarTarefaInicial, onConcluir],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ReturnAfterPauseCard
        corpoComTexto={corpoComTexto}
        porqueTexto={porqueTexto}
        onSubmit={handleSubmit}
        carregando={enviando}
        erro={erro}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
});
