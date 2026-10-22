import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface PausaIntencaoScreenProps {
  appLabel: string;
  /** Duração da pausa desta sessão (10/20/.../60s — ver duracaoPausaIntencaoSeg). */
  duracaoSeg: number;
  /** Sessões restantes hoje; null = sem limite diário (nada a mostrar). */
  saldo: number | null;
  onLiberar: (intencao: string) => void;
  onAgoraNao: () => void;
  /** Mensagem da janela noturna (HU-06, RN-09); ausente = texto padrão da HU-04. */
  mensagemNoturna?: string;
  /** Alternativa noturna da pessoa (RN-10); só aparece junto de `mensagemNoturna`. */
  alternativa?: string;
  /** Fecha a interceptação sem liberar a sessão. */
  onAlternativa?: () => void;
}

/**
 * Pausa antes de liberar cada sessão: pergunta opcional e botão que só
 * habilita ao fim da contagem. O estado é local de propósito — se o usuário
 * sai da tela, a próxima tentativa monta uma instância nova e a contagem
 * recomeça (regra 5). Fricção, não punição: ele pode sair a qualquer
 * momento, e o texto é só o respiro.
 */
export function PausaIntencaoScreen({
  appLabel,
  duracaoSeg,
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

  return (
    <View style={styles.conteudo} testID="pausa-intencao">
      {mensagemNoturna ? (
        <>
          <Text accessibilityRole="status" style={styles.nota}>
            Você está perto do seu horário de dormir.
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.titulo}>
            {mensagemNoturna}
          </Text>
        </>
      ) : (
        <Text style={styles.titulo}>O que você vai fazer agora?</Text>
      )}
      <Text style={styles.apoio}>
        Um respiro antes de abrir o {appLabel}. Escrever é opcional.
        {saldo === null
          ? ''
          : saldo === 1
          ? ' Resta 1 sessão hoje.'
          : ` Restam ${saldo} sessões hoje.`}
      </Text>
      <TextField
        label="Se quiser, escreva (opcional)"
        value={intencao}
        onChangeText={setIntencao}
        returnKeyType="done"
      />
      <View style={styles.acoes}>
        <PrimaryButton
          titulo={liberado ? 'Liberar' : `Liberar em ${restante}s`}
          onPress={() => onLiberar(intencao)}
          desabilitado={!liberado}
        />
        {mensagemNoturna && alternativa && onAlternativa && (
          <SecondaryButton titulo={alternativa} onPress={onAlternativa} />
        )}
        <SecondaryButton titulo="Agora não" onPress={onAgoraNao} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  nota: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  apoio: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  acoes: {
    gap: theme.spacing.md,
  },
});
