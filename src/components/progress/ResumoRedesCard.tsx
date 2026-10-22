import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { theme } from '../../theme';
import { BarraDia, ResumoCardSemana } from '../../domain/resumoRedes';

interface ResumoRedesCardProps {
  comAcessoDeUso: boolean;
  resumo: ResumoCardSemana;
  onMedirTempo: () => void;
}

const ROTULO_BARRA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Altura mínima visível (%) pra um dia com uso real não desaparecer na barra. */
const ALTURA_MINIMA_PCT = 4;

function alturaPct(barra: BarraDia, maiorSegundos: number): number {
  if (barra.segundos === null || barra.segundos <= 0 || maiorSegundos === 0) {
    return 0;
  }
  return Math.max(ALTURA_MINIMA_PCT, (barra.segundos / maiorSegundos) * 100);
}

/**
 * Card do Progresso com o tempo nas redes da semana (HU-08). Componente
 * burro — quem decide os números é useResumoRedes/domain/resumoRedes.
 * "Hoje" na barra é contorno (sem preenchimento), não tracejado:
 * `borderStyle: 'dashed'` do React Native não renderiza no Android.
 */
export function ResumoRedesCard({
  comAcessoDeUso,
  resumo,
  onMedirTempo,
}: ResumoRedesCardProps) {
  const maiorSegundos = Math.max(0, ...resumo.barras.map(b => b.segundos ?? 0));

  return (
    <View testID="resumo-redes-card" style={styles.container}>
      <Text style={styles.eyebrow}>
        {comAcessoDeUso ? 'Redes sociais · esta semana' : 'Bloqueio · esta semana'}
      </Text>

      {comAcessoDeUso && (
        <>
          <Text style={styles.duracao}>{resumo.duracaoTotal}</Text>
          {resumo.comparacao && <Text style={styles.comparacao}>{resumo.comparacao}</Text>}

          <View testID="resumo-redes-chart" style={styles.chart}>
            {resumo.barras.map(barra => (
              <View key={barra.data} style={styles.barraTrilha}>
                <View
                  testID={`resumo-redes-barra-${barra.data}`}
                  style={[
                    styles.barra,
                    { height: `${alturaPct(barra, maiorSegundos)}%` },
                    barra.hoje && styles.barraHoje,
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.chartRotulos}>
            {ROTULO_BARRA.map((rotulo, indice) => (
              <Text key={indice} style={styles.chartRotulo}>
                {rotulo}
              </Text>
            ))}
          </View>

          <View style={styles.divisor} />
        </>
      )}

      <View style={styles.contadores}>
        <View style={styles.contador}>
          <Text style={styles.contadorNumero}>{resumo.contadores.sessoesUsadas}</Text>
          <Text style={styles.contadorRotulo}>sessões</Text>
        </View>
        <View style={styles.contador}>
          <Text style={styles.contadorNumero}>{resumo.contadores.acessosRapidos}</Text>
          <Text style={styles.contadorRotulo}>acessos rápidos</Text>
        </View>
        <View style={styles.contador}>
          <Text style={styles.contadorNumero}>{resumo.contadores.emergencias}</Text>
          <Text style={styles.contadorRotulo}>emergências</Text>
        </View>
      </View>

      {!comAcessoDeUso && (
        <>
          <View style={styles.divisor} />
          <View style={styles.linhaMedirTempo}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={styles.medirTempoTexto}>Quer ver quanto tempo passa nas redes?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onMedirTempo}
              hitSlop={8}
              style={styles.linkMedirTempo}
            >
              <Text style={styles.linkMedirTempoTexto}>Medir tempo</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  duracao: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  comparacao: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  barraTrilha: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barra: {
    width: '100%',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.musgo,
    minHeight: 0,
  },
  barraHoje: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.musgo,
  },
  chartRotulos: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  chartRotulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
  },
  divisor: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  contadores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contador: {
    alignItems: 'center',
  },
  contadorNumero: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  contadorRotulo: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  linhaMedirTempo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  medirTempoTexto: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  linkMedirTempo: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkMedirTempoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
