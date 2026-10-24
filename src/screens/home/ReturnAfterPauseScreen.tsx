import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet } from 'react-native';
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

// No Android com edge-to-edge (RN 0.87+) o `adjustResize` não encolhe mais a
// janela — o teclado entra por cima do campo e do botão "Voltar a começar".
// O voltar físico fica bloqueado de propósito nessa tela (ver useBlockHardwareBack
// acima), então sem esse ajuste o usuário não tem rota de saída. Mesmo fix da
// SignUpScreen/HomeScreen: acompanha a altura do teclado à mão e cria espaço
// equivalente no fim do ScrollView, depois rola até lá.
const ATRASO_SCROLL_TECLADO_MS = 50;

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
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const aoMostrar = Keyboard.addListener('keyboardDidShow', evento => {
      setAlturaTeclado(evento.endCoordinates.height);
    });
    const aoEsconder = Keyboard.addListener('keyboardDidHide', () => {
      setAlturaTeclado(0);
    });
    return () => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, []);

  useEffect(() => {
    if (alturaTeclado === 0) {
      return;
    }
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, ATRASO_SCROLL_TECLADO_MS);
    return () => clearTimeout(id);
  }, [alturaTeclado]);

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
      <ScrollView
        ref={scrollRef}
        testID="return-after-pause-scroll"
        contentContainerStyle={[
          styles.conteudo,
          alturaTeclado > 0 && {
            paddingBottom: alturaTeclado + theme.spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ReturnAfterPauseCard
          corpoComTexto={corpoComTexto}
          porqueTexto={porqueTexto}
          onSubmit={handleSubmit}
          carregando={enviando}
          erro={erro}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  conteudo: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
});
