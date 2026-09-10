import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField } from '../TextField';
import { PrimaryButton } from '../PrimaryButton';
import type { ProvedorConta } from '../../services/auth';

interface ReauthPromptModalProps {
  visible: boolean;
  provedor: ProvedorConta | null;
  erro: string | null;
  carregando: boolean;
  /** senha só é passada em conta e-mail/senha; em conta Google vem indefinida. */
  onSubmit: (senha?: string) => void;
  onCancel: () => void;
}

/**
 * Pedido de reautenticação quando o Auth exige login recente para concluir a
 * exclusão. Componente burro: recebe o provedor e devolve a ação. Em conta
 * Google não há campo de senha — só um botão que refaz o login.
 */
export function ReauthPromptModal({
  visible,
  provedor,
  erro,
  carregando,
  onSubmit,
  onCancel,
}: ReauthPromptModalProps) {
  const [senha, setSenha] = useState('');
  const ehGoogle = provedor === 'google.com';

  useEffect(() => {
    if (!visible) {
      setSenha('');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.fundo}>
        <View style={styles.cartao}>
          <Text style={styles.titulo}>Confirme que é você</Text>
          <Text style={styles.corpo}>
            {ehGoogle
              ? 'Por segurança, entre de novo com o Google para concluir a exclusão da sua conta.'
              : 'Por segurança, digite sua senha de novo para concluir a exclusão da sua conta.'}
          </Text>

          {!ehGoogle && (
            <TextField
              label="Senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              erro={erro ?? undefined}
            />
          )}
          {ehGoogle && erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <PrimaryButton
            titulo={ehGoogle ? 'Entrar com o Google' : 'Confirmar e excluir'}
            onPress={() => onSubmit(ehGoogle ? undefined : senha)}
            desabilitado={carregando || (!ehGoogle && senha.length === 0)}
          />

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.botaoCancelar}
            hitSlop={8}
          >
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  cartao: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.md * 1.5,
  },
  erro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
  },
  botaoCancelar: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  textoCancelar: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
});
