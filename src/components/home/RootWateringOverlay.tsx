import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../../theme';
import { calcularAlturaCaule } from '../../domain/rootGrowth';
import { calcularProgressoProximoMarco } from '../../domain/streak';
import { caminhoCaule, RootProgressIcon } from '../RootProgressIcon';

const TAMANHO_CENA = 96;

// Sequência (ver racional completo na tarefa): 0-400ms um ponto Cobre
// aparece e desce pelo caule; 400-900ms o caule pulsa Cobre e volta ao
// Musgo (uma pulsação, não brilho fixo — Cobre continua accent raro);
// 900ms-3s o conteúdo final (mensagem, barra até o próximo marco, e a
// linha de desbloqueio quando aplicável) fica visível. Auto-dismiss no
// fim, ou toque em qualquer lugar fecha antes.
const DURACAO_TOTAL_MS = 3000;
const ATRASO_PULSO_MS = 400;
const DURACAO_PULSO_MS = 500;
const ATRASO_CONTEUDO_MS = 900;
const DURACAO_ENTRADA_CONTEUDO_MS = 300;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface RootWateringOverlayProps {
  visible: boolean;
  /** Dias de sequência já contando hoje (ver StreakCard.diasSequenciaVisivel
   * — mesma convenção: streakAtual + 1, já que essa animação só dispara
   * depois de concluir a essencial de hoje). Define a altura NOVA do caule
   * (calcularAlturaCaule) e o progresso até o próximo marco. */
  diasSequencia: number;
  /** Uma das frases de MENSAGENS_TAREFA_CONCLUIDA (taskFeedbackMessages.ts)
   * — sorteada por quem chama, mesmo padrão já usado pro TaskCompletedOverlay
   * simples (não sorteia de novo aqui, pra não re-sortear a cada render). */
  submensagem: string;
  /**
   * Nomes já resolvidos dos apps selecionados no bloqueio — [] quando
   * users/{uid}.bloqueioApps.appsSelecionados está vazio. A linha de
   * desbloqueio só renderiza quando este array não está vazio; sem
   * placeholder nem texto alternativo pro caso vazio.
   */
  appsDesbloqueados: string[];
  onHide: () => void;
}

/**
 * Feedback de "regar a raiz" ao concluir uma tarefa ESSENCIAL — substitui o
 * TaskCompletedOverlay simples só nesse caminho (tarefa comum continua
 * usando o overlay leve, ver HomeScreen). Sem confete/partículas/mascote
 * (02-identidade-visual.md): a "água" é só um pulso da cor Cobre descendo
 * pelo caule do RootProgressIcon já existente, que volta ao Musgo — Cobre
 * nunca fica permanente.
 */
export function RootWateringOverlay({
  visible,
  diasSequencia,
  submensagem,
  appsDesbloqueados,
  onHide,
}: RootWateringOverlayProps) {
  const pontoProgresso = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(0)).current;
  const conteudoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    pontoProgresso.setValue(0);
    pulso.setValue(0);
    conteudoOpacity.setValue(0);

    const sequenciaPulso = Animated.sequence([
      Animated.timing(pontoProgresso, {
        toValue: 1,
        duration: ATRASO_PULSO_MS,
        useNativeDriver: false,
      }),
      Animated.timing(pulso, {
        toValue: 1,
        duration: DURACAO_PULSO_MS / 2,
        useNativeDriver: false,
      }),
      Animated.timing(pulso, {
        toValue: 0,
        duration: DURACAO_PULSO_MS / 2,
        useNativeDriver: false,
      }),
    ]);
    sequenciaPulso.start();

    const animacaoConteudo = Animated.timing(conteudoOpacity, {
      toValue: 1,
      duration: DURACAO_ENTRADA_CONTEUDO_MS,
      delay: ATRASO_CONTEUDO_MS,
      useNativeDriver: true,
    });
    animacaoConteudo.start();

    const temporizador = setTimeout(onHide, DURACAO_TOTAL_MS);
    // Sem parar as animações aqui, elas continuam rodando (RAF interno,
    // não preso ao ciclo de vida do componente) mesmo depois de esconder/
    // desmontar — sobra de trabalho e, em teste, updates fora de act().
    return () => {
      clearTimeout(temporizador);
      sequenciaPulso.stop();
      animacaoConteudo.stop();
    };
  }, [visible, onHide, pontoProgresso, pulso, conteudoOpacity]);

  if (!visible) {
    return null;
  }

  const pontoY = pontoProgresso.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 40],
  });
  const pontoOpacity = pontoProgresso.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });
  const corCaule = pulso.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.musgo, theme.colors.cobre],
  });

  const { proximoMarco, diasFaltantes, fracaoPreenchida } =
    calcularProgressoProximoMarco(diasSequencia);
  const alturaCaule = calcularAlturaCaule(diasSequencia);

  return (
    <Pressable
      testID="root-watering-overlay"
      accessibilityRole="alert"
      style={styles.fundo}
      onPress={onHide}
    >
      <View style={styles.cartao}>
        <View style={styles.cena}>
          <RootProgressIcon
            variant="completo"
            tamanho={TAMANHO_CENA}
            diasSequencia={diasSequencia}
          />
          <Svg
            testID="root-watering-pulso"
            style={StyleSheet.absoluteFill}
            width={TAMANHO_CENA}
            height={TAMANHO_CENA}
            viewBox="0 0 96 96"
          >
            <AnimatedPath
              testID="root-watering-caule-pulso"
              d={caminhoCaule(alturaCaule)}
              stroke={corCaule}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
            <AnimatedCircle
              testID="root-watering-ponto"
              cx={48}
              cy={pontoY}
              r={4}
              fill={theme.colors.cobre}
              opacity={pontoOpacity}
            />
          </Svg>
        </View>

        <Animated.View style={{ opacity: conteudoOpacity }}>
          <Text style={styles.mensagem}>A raiz recebeu hoje.</Text>
          <Text style={styles.submensagem}>{submensagem}</Text>

          {proximoMarco !== null && (
            <>
              <View style={styles.progressoLinha}>
                <Text style={styles.progressoLabel}>
                  {diasSequencia} {diasSequencia === 1 ? 'dia' : 'dias'}
                </Text>
                <Text style={styles.progressoLabel}>
                  próximo ramo em {diasFaltantes}
                </Text>
              </View>
              <View style={styles.barraFundo}>
                <View
                  style={[
                    styles.barraPreenchida,
                    { width: `${fracaoPreenchida * 100}%` },
                  ]}
                />
              </View>
            </>
          )}

          {appsDesbloqueados.length > 0 && (
            <Text style={styles.desbloqueio} testID="root-watering-desbloqueio">
              ✓ acesso liberado · {appsDesbloqueados.join(', ')}
            </Text>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fundo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  cartao: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cena: {
    width: TAMANHO_CENA,
    height: TAMANHO_CENA,
  },
  mensagem: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  submensagem: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  progressoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  progressoLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
  barraFundo: {
    width: '100%',
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.musgo,
  },
  desbloqueio: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgoClaro,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
