import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface EsperaBloqueioScreenProps {
  /** cooldown = contagem regressiva até a próxima sessão; zerado = sessões do dia usadas (só com limite diário). */
  variante: 'cooldown' | 'zerado';
  /** Só usado em 'cooldown'. */
  restanteMs?: number;
  /** Quantas sessões cada tarefa extra concluída rende. */
  blocoPorTarefaExtra: number;
  onSessaoFoco: () => void;
  onTarefasExtras: () => void;
  onSair: () => void;
}

/**
 * Cooldown entre sessões e saldo zerado: as duas saídas úteis ficam à mão —
 * sessão de foco e tarefas extras (que rendem sessão). Texto neutro, sem
 * cobrança. O cooldown mostra minutos (arredondados para cima) e o texto
 * lido pelo leitor de tela também muda só por minuto.
 */
export function EsperaBloqueioScreen({
  variante,
  restanteMs = 0,
  blocoPorTarefaExtra,
  onSessaoFoco,
  onTarefasExtras,
  onSair,
}: EsperaBloqueioScreenProps) {
  const textoExtras =
    blocoPorTarefaExtra === 1
      ? 'Cada tarefa extra concluída rende 1 sessão.'
      : `Cada tarefa extra concluída rende ${blocoPorTarefaExtra} sessões.`;
  const minutos = Math.ceil(Math.max(0, restanteMs) / 60_000);

  return (
    <View style={styles.conteudo} testID={`espera-${variante}`}>
      {variante === 'cooldown' ? (
        <>
          <Text
            style={styles.contagem}
            testID="espera-contagem"
            accessibilityRole="timer"
            accessibilityLabel={`Próximo acesso em ${minutos} ${
              minutos === 1 ? 'minuto' : 'minutos'
            }`}
            accessibilityLiveRegion="polite"
          >
            {`Próximo acesso em ${minutos} min`}
          </Text>
          <Text style={styles.apoio}>
            Enquanto isso, dá pra fazer uma pausa de 5 minutos ou uma tarefa
            extra. {textoExtras}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.titulo}>Você usou as sessões de hoje</Text>
          <Text style={styles.apoio}>
            Dá pra fazer uma sessão de foco ou uma tarefa extra. {textoExtras}
          </Text>
        </>
      )}
      <View style={styles.acoes}>
        <PrimaryButton titulo="Iniciar uma sessão de foco" onPress={onSessaoFoco} />
        <SecondaryButton titulo="Ver tarefas extras" onPress={onTarefasExtras} />
        <SecondaryButton titulo="Sair" onPress={onSair} />
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
  contagem: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
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
