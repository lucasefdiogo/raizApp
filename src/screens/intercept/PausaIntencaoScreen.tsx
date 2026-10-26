import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { InterceptLayout } from '../../components/intercept/InterceptLayout';

interface PausaIntencaoScreenProps {
  appIconeBase64: string;
  appLabel: string;
  /** Duração da pausa desta sessão (10/20/.../60s, ou dobrada na janela noturna — ver duracaoPausaIntencaoSeg). */
  duracaoSeg: number;
  /** Para o botão ao zerar: "Liberar {duracaoBlocoMin} min" (RN04). */
  duracaoBlocoMin: number;
  /** Posição da sessão no dia, a partir de 1 (RN03). */
  posicaoSessao: number;
  /** Sessões restantes hoje; null = sem limite diário (nada a mostrar). */
  saldo: number | null;
  onLiberar: (intencao: string) => void;
  onAgoraNao: () => void;
  /** Mensagem da janela noturna (RN05); ausente = texto padrão. */
  mensagemNoturna?: string;
  /** Alternativa noturna da pessoa (RN08); só aparece junto de `mensagemNoturna`. */
  alternativa?: string;
  /** Fecha a interceptação sem liberar a sessão. */
  onAlternativa?: () => void;
}

function formatarMS(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

/**
 * Pausa antes de liberar cada sessão (HU-04/HU-06/HU-11, RN03/RN04/RN05/RN08):
 * pergunta opcional e botão que só habilita ao fim da contagem — embutida no
 * próprio botão, não existe outro timer na tela. Estado local de propósito —
 * se a pessoa sai da tela, a próxima tentativa monta uma instância nova e a
 * contagem recomeça (RN09 da HU-04). Fricção, não punição.
 */
export function PausaIntencaoScreen({
  appIconeBase64,
  appLabel,
  duracaoSeg,
  duracaoBlocoMin,
  posicaoSessao,
  saldo,
  onLiberar,
  onAgoraNao,
  mensagemNoturna,
  alternativa,
  onAlternativa,
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
  const noturna = !!mensagemNoturna;

  const textoSaldo =
    saldo === null ? '' : saldo === 1 ? 'Resta 1 sessão hoje.' : `Restam ${saldo} sessões hoje.`;

  return (
    <InterceptLayout
      appIconeBase64={appIconeBase64}
      appNome={appLabel}
      eyebrow={noturna ? `JANELA NOTURNA · ${posicaoSessao}ª SESSÃO` : `${posicaoSessao}ª SESSÃO HOJE`}
      headline={noturna ? mensagemNoturna! : 'O que você vai fazer agora?'}
      headlineItalico={noturna}
      onVoltarAoInicio={onAgoraNao}
      acaoPrincipal={
        <View style={styles.acoes}>
          {alternativa && onAlternativa && (
            <Pressable
              accessibilityRole="button"
              onPress={onAlternativa}
              style={({ pressed }) => [
                styles.botaoAlternativa,
                pressed && styles.botaoAlternativaPressionado,
              ]}
            >
              <BookOpen size={16} color={theme.colors.terraSuave} />
              <Text style={styles.textoAlternativa}>{alternativa} em vez disso</Text>
            </Pressable>
          )}
          {liberado ? (
            <PrimaryButton
              titulo={`Liberar ${duracaoBlocoMin} min`}
              onPress={() => onLiberar(intencao)}
            />
          ) : (
            <View
              accessible
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              style={styles.botaoContagem}
            >
              <Text style={styles.textoContagem}>{`Liberar em ${formatarMS(restante)}`}</Text>
            </View>
          )}
        </View>
      }
    >
      <Text style={styles.apoio}>
        Uma pausa curta antes de abrir. Se sair desta tela, ela recomeça.
      </Text>
      {textoSaldo !== '' && <Text style={styles.saldo}>{textoSaldo}</Text>}
      <TextField
        label="Se quiser, escreva (opcional)"
        placeholder={noturna ? 'O que você vai fazer agora? (opcional)' : 'Opcional. Ex.: responder a turma'}
        value={intencao}
        onChangeText={setIntencao}
        returnKeyType="done"
      />
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
  saldo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  acoes: {
    alignSelf: 'stretch',
    gap: theme.spacing.md,
  },
  // Fundo neutro, texto Space Mono (RN04) — não é o PrimaryButton ainda:
  // só habilita (e vira Cobre) quando a contagem zera.
  botaoContagem: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  textoContagem: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textPrimary,
  },
  botaoAlternativa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.terraSuave,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
  },
  botaoAlternativaPressionado: {
    opacity: 0.7,
  },
  textoAlternativa: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.terraSuave,
  },
});
