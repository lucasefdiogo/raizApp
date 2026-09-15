import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { ALTURA_MINIMA_TOOLTIP_TOUR } from './tourSteps';

export interface MedidaAlvoTour {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * `View` (o export do react-native) tipa pro componente em si nesta versão
 * do RN, não pra instância nativa — o ref/instância real é
 * `React.ComponentRef<typeof View>`. Tipo compartilhado pra quem cria
 * (MainTabNavigator/HomeScreen) ou só repassa (HojeStack) os refs dos 5
 * alvos do tour.
 */
export type RefAlvoTour = React.RefObject<React.ComponentRef<typeof View> | null>;

export interface FeatureTourOverlayProps {
  /** 0-indexado. */
  passoAtual: number;
  totalPassos: number;
  texto: string;
  /** null enquanto a medição do alvo ainda não resolveu (ou não há alvo
   * visível no momento) — mostra o balão sem recorte, em vez de piscar. */
  medida: MedidaAlvoTour | null;
  onAvancar: () => void;
  onPular: () => void;
}

const BORDA_DESTAQUE = 3;
const MARGEM_BALAO = theme.spacing.md;

/**
 * Coach mark de tela cheia: 4 faixas escurecidas ao redor do retângulo do
 * alvo (em vez de máscara SVG) criam o "recorte" — a área do meio nunca
 * recebe nenhuma view por cima, então o elemento real aparece sem
 * escurecer. Todo o overlay captura toque (não deixa passar pro app por
 * baixo) — é por isso que HomeScreen não precisa se preocupar com scroll
 * ao vivo durante um passo: nada por baixo responde a toque enquanto isso
 * está montado. Componente burro: não mede nada, não decide texto — só
 * desenha a partir de `medida`/`texto` recebidos.
 *
 * Renderizado a partir do MainTabNavigator, não da HomeScreen — a tab bar
 * é uma árvore irmã da tela de conteúdo (fora do container que a
 * HomeScreen consegue cobrir), então um overlay montado dentro da
 * HomeScreen nunca conseguiria desenhar por cima dela (ficava atrás,
 * cortado — bug real visto em device físico nos passos com alvo perto do
 * fim da tela: balão cortado, e o recorte das abas Progresso/Perfil nem
 * aparecia). A HomeScreen mede os 5 alvos e repassa o resultado pra cima
 * via callback (aoAtualizarTour), e é o MainTabNavigator quem efetivamente
 * renderiza este componente, num nível que cobre tela inteira + tab bar.
 *
 * useWindowDimensions() dá a altura CHEIA da janela (o app roda
 * edge-to-edge — ver CLAUDE.md/memória do projeto), incluindo a área atrás
 * da status bar e da barra de gestos do Android. Sem descontar
 * useSafeAreaInsets() dali, o balão podia acabar posicionado atrás da barra
 * de gestos — os controles ficavam inacessíveis e, como o overlay bloqueia
 * toque no resto da tela, travava o tour sem saída (bug real, reportado em
 * device físico). `topoBalao`/`alturaMaximaBalao` abaixo garantem que o
 * balão nunca começa nem termina fora da área seguro-visível, não importa
 * a posição do alvo.
 */
export function FeatureTourOverlay({
  passoAtual,
  totalPassos,
  texto,
  medida,
  onAvancar,
  onPular,
}: FeatureTourOverlayProps) {
  const { height: alturaTela } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ultimoPasso = passoAtual >= totalPassos - 1;

  const topoSeguro = insets.top + MARGEM_BALAO;
  const baseSegura = alturaTela - insets.bottom - MARGEM_BALAO;
  const limiteInferiorTopo = Math.max(
    baseSegura - ALTURA_MINIMA_TOOLTIP_TOUR,
    topoSeguro,
  );

  function calcularTopoBalao(): number {
    if (!medida) {
      return alturaTela * 0.4;
    }
    const espacoAbaixo = baseSegura - (medida.y + medida.height + MARGEM_BALAO);
    if (espacoAbaixo >= ALTURA_MINIMA_TOOLTIP_TOUR) {
      return medida.y + medida.height + MARGEM_BALAO;
    }
    const topoSeAcima = medida.y - MARGEM_BALAO - ALTURA_MINIMA_TOOLTIP_TOUR;
    if (topoSeAcima >= topoSeguro) {
      return topoSeAcima;
    }
    return topoSeguro;
  }

  // Trava final: não importa o que calcularTopoBalao() devolveu, o balão
  // nunca começa acima da status bar nem se estende além da barra de
  // gestos — maxHeight faz o texto ganhar scroll interno em vez de vazar
  // pra fora da área segura.
  const topoBalao = Math.min(
    Math.max(calcularTopoBalao(), topoSeguro),
    limiteInferiorTopo,
  );
  const alturaMaximaBalao = baseSegura - topoBalao;

  const estiloBalao = { top: topoBalao, maxHeight: alturaMaximaBalao };

  return (
    <View style={StyleSheet.absoluteFill} testID="feature-tour-overlay">
      {medida ? (
        <>
          <View
            style={[
              styles.faixaDim,
              { top: 0, left: 0, right: 0, height: Math.max(medida.y, 0) },
            ]}
          />
          <View
            style={[
              styles.faixaDim,
              {
                top: medida.y + medida.height,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />
          <View
            style={[
              styles.faixaDim,
              {
                top: medida.y,
                left: 0,
                width: Math.max(medida.x, 0),
                height: medida.height,
              },
            ]}
          />
          <View
            style={[
              styles.faixaDim,
              {
                top: medida.y,
                left: medida.x + medida.width,
                right: 0,
                height: medida.height,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.destaque,
              {
                top: medida.y - BORDA_DESTAQUE,
                left: medida.x - BORDA_DESTAQUE,
                width: medida.width + BORDA_DESTAQUE * 2,
                height: medida.height + BORDA_DESTAQUE * 2,
              },
            ]}
          />
        </>
      ) : (
        <View style={[styles.faixaDim, StyleSheet.absoluteFill]} />
      )}

      <View
        style={[styles.balao, estiloBalao]}
        testID="feature-tour-balao"
      >
        {/* Scroll interno só no texto — os controles ficam fora, sempre
            renderizados por inteiro. Mesmo se o texto precisasse de mais
            espaço do que a área segura tem, dá pra rolar até o fim em vez
            de perder acesso aos botões (ver nota de segurança acima). */}
        <ScrollView
          style={styles.textoRolavel}
          contentContainerStyle={styles.textoRolavelConteudo}
        >
          <Text style={styles.indicador}>
            Passo {passoAtual + 1} de {totalPassos}
          </Text>
          <Text style={styles.texto}>{texto}</Text>
        </ScrollView>
        <View style={styles.controles}>
          <Pressable
            accessibilityRole="button"
            onPress={onPular}
            hitSlop={8}
            style={styles.pular}
          >
            <Text style={styles.pularTexto}>Pular tour</Text>
          </Pressable>
          <View style={styles.botaoProximo}>
            <PrimaryButton
              titulo={ultimoPasso ? 'Concluir' : 'Próximo'}
              onPress={onAvancar}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  faixaDim: {
    position: 'absolute',
    backgroundColor: theme.colors.terraEscura,
    opacity: 0.72,
  },
  destaque: {
    position: 'absolute',
    borderWidth: BORDA_DESTAQUE,
    borderColor: theme.colors.cobre,
    borderRadius: theme.radius.sm,
  },
  balao: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.terraEscura,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
  },
  textoRolavel: {
    flexShrink: 1,
  },
  textoRolavelConteudo: {
    gap: theme.spacing.sm,
  },
  indicador: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobreClaro,
  },
  texto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.casca,
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  pular: {
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  pularTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.areia,
  },
  botaoProximo: {
    minWidth: 140,
  },
});
