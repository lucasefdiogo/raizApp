import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { theme } from '../../theme';
import { InterceptLayout } from '../../components/intercept/InterceptLayout';
import { ContagemEspera } from '../../components/intercept/ContagemEspera';

interface EsperaAcessoRapidoScreenProps {
  appIconeBase64: string;
  appLabel: string;
  /** 5s fora da janela noturna, 30s dentro dela (RN09). */
  esperaSeg: number;
  /** Chamado uma vez, ao zerar — o app abre direto (RN09). */
  onLiberado: () => void;
  /** Cancela sem gastar a cota do acesso rápido (RN09). */
  onVoltarAoInicio: () => void;
  /** Mensagem da janela noturna (RN07); ausente = texto padrão. */
  mensagemNoturna?: string;
  /** Alternativa noturna da pessoa (RN08); só aparece junto de `mensagemNoturna`. */
  alternativa?: string;
  onAlternativa?: () => void;
}

/**
 * Espera do acesso rápido (HU-11, RN09) — tela própria, não mais um widget
 * dentro do cooldown. Sem botão: ao zerar, o app abre por conta própria.
 * "Voltar ao início" cancela sem gastar a cota.
 */
export function EsperaAcessoRapidoScreen({
  appIconeBase64,
  appLabel,
  esperaSeg,
  onLiberado,
  onVoltarAoInicio,
  mensagemNoturna,
  alternativa,
  onAlternativa,
}: EsperaAcessoRapidoScreenProps) {
  const [restante, setRestante] = useState(esperaSeg);
  const noturna = !!mensagemNoturna;

  useEffect(() => {
    if (restante <= 0) {
      onLiberado();
      return;
    }
    const id = setTimeout(() => setRestante(restante - 1), 1000);
    return () => clearTimeout(id);
    // onLiberado muda a cada render do pai; só o contador dispara o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  return (
    <InterceptLayout
      appIconeBase64={appIconeBase64}
      appNome={appLabel}
      eyebrow="ACESSO RÁPIDO"
      headline={noturna ? mensagemNoturna! : 'Liberando 2 minutos'}
      headlineItalico={noturna}
      onVoltarAoInicio={onVoltarAoInicio}
      acaoPrincipal={
        <>
          <ContagemEspera
            texto={`${restante} s`}
            accessibilityLabel={`Liberando em ${restante} ${restante === 1 ? 'segundo' : 'segundos'}`}
          />
          {noturna && alternativa && onAlternativa && (
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
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  botaoAlternativa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.terraSuave,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
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
