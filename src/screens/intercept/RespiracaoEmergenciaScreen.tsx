import React, { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';
import { InterceptLayout } from '../../components/intercept/InterceptLayout';
import { useVoltarFisico } from '../../hooks/useVoltarFisico';

interface RespiracaoEmergenciaScreenProps {
  appIconeBase64: string;
  appLabel: string;
  /** Duração da respiração guiada, em segundos (60 na emergência). */
  duracaoSeg: number;
  /** Chamado uma vez, ao zerar. Não há como pular antes. */
  onConcluir: () => void;
  /** Voltar físico (RN12): cancela sem liberar. */
  onCancelar: () => void;
}

/** Metade do ciclo (cresce/diminui) — RN12. */
const DURACAO_FASE_SEG = 5;
const DURACAO_FASE_MS = DURACAO_FASE_SEG * 1000;

function formatar(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Respiração guiada da saída de emergência (HU-05/HU-11, RN12): só
 * contagem, sem botão de pular — o voltar físico cancela sem liberar. Com
 * "reduzir movimento" ativo no Android, o círculo fica parado e só a
 * contagem e o texto alternam.
 */
export function RespiracaoEmergenciaScreen({
  appIconeBase64,
  appLabel,
  duracaoSeg,
  onConcluir,
  onCancelar,
}: RespiracaoEmergenciaScreenProps) {
  const [restante, setRestante] = useState(duracaoSeg);
  // null = ainda não sabemos — não começa a animar até checar, pra não
  // iniciar o loop e cancelar um frame depois quando "reduzir movimento"
  // estiver ativo.
  const [reduzido, setReduzido] = useState<boolean | null>(null);
  const escala = useRef(new Animated.Value(0)).current;

  useVoltarFisico(onCancelar);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduzido);
  }, []);

  useEffect(() => {
    if (reduzido !== false) {
      return;
    }
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(escala, {
          toValue: 1,
          duration: DURACAO_FASE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(escala, {
          toValue: 0,
          duration: DURACAO_FASE_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [reduzido, escala]);

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

  const elapsed = duracaoSeg - restante;
  const inspirando = Math.floor(elapsed / DURACAO_FASE_SEG) % 2 === 0;

  return (
    <InterceptLayout
      appIconeBase64={appIconeBase64}
      appNome={appLabel}
      eyebrow="SAÍDA DE EMERGÊNCIA"
      headline={inspirando ? 'Inspire' : 'Solte o ar'}
    >
      <Text style={styles.apoio}>
        {`Acompanhe o círculo. No fim, o ${appLabel} fica liberado por 2 minutos.`}
      </Text>
      <Animated.View
        testID="circulo-respiracao"
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.circulo,
          !reduzido && {
            transform: [
              {
                scale: escala.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }),
              },
            ],
          },
        ]}
      />
      <Text
        style={styles.contagem}
        testID="respiracao-contagem"
        accessibilityRole="timer"
        accessibilityLabel={`Faltam ${restante} ${restante === 1 ? 'segundo' : 'segundos'}`}
        accessibilityLiveRegion="polite"
      >
        {formatar(restante)}
      </Text>
      <Text style={styles.rodape}>Esta pausa não tem como pular.</Text>
    </InterceptLayout>
  );
}

const styles = StyleSheet.create({
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
  rodape: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
