import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { RootProgressIcon } from '../../components/RootProgressIcon';
import { obterMensagemSplash } from '../../utils/splashMessages';

const DURACAO_ENTRADA_ICONE_MS = 520;
const ATRASO_FRASE_MS = 340;
const DURACAO_ENTRADA_FRASE_MS = 420;

/**
 * Tempo mínimo que a Splash fica na tela antes de avisar que terminou —
 * evita o "pisca" quando as checagens de boot resolvem quase instantâneas.
 * A entrada animada (ícone + frase) cabe folgada dentro dele.
 */
export const DURACAO_SPLASH_MS = 1200;

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

/**
 * Componente "burro": só toca a animação de entrada (fade + scale sutil do
 * RootProgressIcon, fade levemente atrasado da frase) e chama
 * onAnimationEnd depois de DURACAO_SPLASH_MS. Não sabe nada de boot logic,
 * auth ou navegação — quem decide o que fazer quando a animação acaba é o
 * componente raiz.
 */
export function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  const iconeOpacity = useRef(new Animated.Value(0)).current;
  const iconeScale = useRef(new Animated.Value(0.9)).current;
  const fraseOpacity = useRef(new Animated.Value(0)).current;
  const [mensagem] = useState(() => obterMensagemSplash());

  useEffect(() => {
    // Agenda o aviso de fim ANTES de tocar a animação — o contrato de tempo
    // (onAnimationEnd depois de DURACAO_SPLASH_MS) não pode depender do
    // Animated ter rodado.
    const temporizador = setTimeout(onAnimationEnd, DURACAO_SPLASH_MS);

    Animated.parallel([
      Animated.timing(iconeOpacity, {
        toValue: 1,
        duration: DURACAO_ENTRADA_ICONE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(iconeScale, {
        toValue: 1,
        duration: DURACAO_ENTRADA_ICONE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(fraseOpacity, {
        toValue: 1,
        delay: ATRASO_FRASE_MS,
        duration: DURACAO_ENTRADA_FRASE_MS,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearTimeout(temporizador);
  }, [iconeOpacity, iconeScale, fraseOpacity, onAnimationEnd]);

  return (
    <Animated.View style={styles.container}>
      <Animated.View
        style={{
          opacity: iconeOpacity,
          transform: [{ scale: iconeScale }],
        }}
      >
        <RootProgressIcon variant="completo" tamanho={120} />
      </Animated.View>
      <Animated.Text style={[styles.frase, { opacity: fraseOpacity }]}>
        {mensagem}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
  },
  frase: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
