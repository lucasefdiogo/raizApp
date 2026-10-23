import React from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

interface SessoesInfoSheetProps {
  visible: boolean;
  duracaoBlocoMin: number;
  cooldownMin: number;
  acessosRapidosDiarios: number;
  onEntendi: () => void;
}

/**
 * Sheet "Como funciona" da seção SESSÕES da `BloqueioAppsScreen` (HU-09,
 * RN06). Burro — só explica os números que `regrasBloqueio` já define, não
 * edita nada.
 */
export function SessoesInfoSheet({
  visible,
  duracaoBlocoMin,
  cooldownMin,
  acessosRapidosDiarios,
  onEntendi,
}: SessoesInfoSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onEntendi}>
      <Pressable style={styles.fundo} onPress={onEntendi}>
        <Pressable
          style={[styles.cartao, { paddingBottom: theme.spacing.xl + insets.bottom }]}
          onPress={() => {}}
        >
          <Text style={styles.titulo}>Como funciona</Text>
          <Text style={styles.paragrafo}>
            Antes de cada sessão, uma pausa curta pergunta o que você vai fazer. Cada sessão dá{' '}
            {duracaoBlocoMin} minutos de uso, contados só com a rede aberta. Depois vem uma pausa
            de {cooldownMin} minutos. Durante a pausa, o acesso rápido libera 2 minutos, até{' '}
            {acessosRapidosDiarios} vezes por dia.
          </Text>
          <PrimaryButton titulo="Entendi" onPress={onEntendi} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  cartao: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  paragrafo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
});
