import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { formatarContagemMs } from '../../domain/saldoBloqueio';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface EsperaBloqueioScreenProps {
  appLabel: string;
  /** cooldown = contagem regressiva até o próximo bloco; zerado = sem blocos até amanhã. */
  variante: 'cooldown' | 'zerado';
  /** Só usado em 'cooldown'. */
  restanteMs?: number;
  saldo: number;
  blocoPorTarefaExtra: number;
  onSessaoFoco: () => void;
  onTarefasExtras: () => void;
  onSair: () => void;
}

/**
 * Cooldown entre blocos e saldo zerado: o app segue bloqueado, mas as duas
 * saídas úteis ficam à mão — sessão de foco e tarefas extras (que rendem
 * bloco). Texto neutro, sem cobrança.
 */
export function EsperaBloqueioScreen({
  appLabel,
  variante,
  restanteMs = 0,
  saldo,
  blocoPorTarefaExtra,
  onSessaoFoco,
  onTarefasExtras,
  onSair,
}: EsperaBloqueioScreenProps) {
  const textoExtras =
    blocoPorTarefaExtra === 1
      ? 'Cada tarefa extra concluída rende 1 bloco.'
      : `Cada tarefa extra concluída rende ${blocoPorTarefaExtra} blocos.`;

  return (
    <View style={styles.conteudo} testID={`espera-${variante}`}>
      {variante === 'cooldown' ? (
        <>
          <Text style={styles.titulo}>Próximo bloco em</Text>
          <Text style={styles.contagem} testID="espera-contagem">
            {formatarContagemMs(restanteMs)}
          </Text>
          <Text style={styles.apoio}>
            {saldo === 1
              ? 'Você tem 1 bloco guardado para depois.'
              : `Você tem ${saldo} blocos guardados para depois.`}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.titulo}>Os blocos de hoje acabaram</Text>
          <Text style={styles.apoio}>
            O {appLabel} volta a ficar disponível amanhã. {textoExtras}
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
    fontSize: theme.typography.fontSize.xxl,
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
