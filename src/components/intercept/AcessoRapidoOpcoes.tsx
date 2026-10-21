import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

interface AcessoRapidoOpcoesProps {
  acessoRapidoDisponivel: boolean;
  /** Segundos de espera (sem campo de texto) entre o toque e a liberação. */
  esperaSeg: number;
  /** Ausente com acesso indisponível = cota do dia esgotada. */
  msAteProximo?: number;
  emergenciaOferecida: boolean;
  onAcessoRapido: () => void;
  onEmergencia: () => void;
}

function rotuloSegundos(s: number): string {
  return `${s} ${s === 1 ? 'segundo' : 'segundos'}`;
}

/**
 * Bloco do acesso rápido na tela de espera: botão (com espera curta antes de
 * liberar), aviso de tempo quando indisponível e, só então, a saída de
 * emergência. Tempo de espera, nunca negativa.
 */
export function AcessoRapidoOpcoes({
  acessoRapidoDisponivel,
  esperaSeg,
  msAteProximo,
  emergenciaOferecida,
  onAcessoRapido,
  onEmergencia,
}: AcessoRapidoOpcoesProps) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (restante === null) return;
    if (restante <= 0) {
      onAcessoRapido();
      return;
    }
    const id = setTimeout(() => setRestante(restante - 1), 1000);
    return () => clearTimeout(id);
    // onAcessoRapido muda a cada render do pai; só o contador dispara o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  if (acessoRapidoDisponivel) {
    return (
      <View style={styles.bloco}>
        {restante === null ? (
          <>
            <Text style={styles.apoio}>
              Se for rápido, dá pra usar 2 minutos agora.
            </Text>
            <PrimaryButton
              titulo="Acesso rápido (2 min)"
              onPress={() => setRestante(Math.max(0, esperaSeg))}
            />
          </>
        ) : (
          <Text
            style={styles.contagem}
            testID="acesso-rapido-espera"
            accessibilityRole="timer"
            accessibilityLabel={`Liberando em ${rotuloSegundos(restante)}`}
            accessibilityLiveRegion="polite"
          >
            {`Liberando em ${restante} s`}
          </Text>
        )}
      </View>
    );
  }

  const minutos =
    msAteProximo === undefined ? null : Math.ceil(Math.max(0, msAteProximo) / 60_000);

  return (
    <View style={styles.bloco}>
      <Text style={styles.nota} accessibilityRole="text" accessibilityLiveRegion="polite">
        {minutos === null
          ? 'Os acessos rápidos de hoje já foram usados'
          : `Próximo acesso rápido em ${minutos} min`}
      </Text>
      {emergenciaOferecida ? (
        <SecondaryButton
          titulo="Preciso agora (respiração de 1 min)"
          onPress={onEmergencia}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: theme.spacing.md,
  },
  apoio: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  contagem: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    minHeight: 48,
  },
  nota: {
    backgroundColor: theme.colors.areia,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
