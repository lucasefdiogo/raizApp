import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface AlternativaNoturnaScreenProps {
  onSalvar: (texto: string) => void;
  /** "Agora não": não grava nada e a pergunta não volta (RN-06). */
  onAgoraNao: () => void;
}

/**
 * Pergunta única, opcional, sobre o que a pessoa gostaria de fazer à noite
 * no lugar das redes (HU-06, RN-06). Editável depois no Perfil.
 */
export function AlternativaNoturnaScreen({
  onSalvar,
  onAgoraNao,
}: AlternativaNoturnaScreenProps) {
  const [texto, setTexto] = useState('');

  const handleSalvar = () => {
    const limpo = texto.trim();
    if (limpo) {
      onSalvar(limpo);
    } else {
      onAgoraNao();
    }
  };

  return (
    <View
      style={styles.conteudo}
      testID="alternativa-noturna"
      accessibilityLabel="Alternativa para a janela noturna"
    >
      <Text accessibilityRole="header" style={styles.titulo}>
        O que você gostaria de fazer à noite?
      </Text>
      <Text style={styles.corpo}>
        No lugar das redes, perto da hora de dormir. Opcional — pode responder
        depois, no Perfil.
      </Text>
      <TextField
        label="Alternativa noturna (opcional)"
        placeholder="Ex.: ler, ouvir um podcast"
        value={texto}
        onChangeText={setTexto}
        returnKeyType="done"
      />
      <View style={styles.acoes}>
        <PrimaryButton titulo="Salvar" onPress={handleSalvar} />
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
  corpo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  acoes: {
    gap: theme.spacing.md,
  },
});
