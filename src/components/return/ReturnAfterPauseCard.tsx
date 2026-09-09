import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

interface ReturnAfterPauseCardProps {
  corpoComTexto: string;
  porqueTexto: string;
  onSubmit: (titulo: string) => void;
  carregando: boolean;
  erro: string | null;
}

const ERRO_CAMPO_VAZIO = 'Escreva 1 coisa pequena antes de continuar';

/**
 * Componente burro: o texto do sistema e o "porquê" do usuário são exibidos
 * como duas vozes separadas (corpo vs. blockquote) — nunca misturados na
 * mesma mensagem. A validação de campo vazio é local (interação de UI); o
 * `erro` recebido via prop é reservado para falhas externas (ex: rede),
 * repassadas pela tela depois que enviarTarefaInicial rejeita.
 */
export function ReturnAfterPauseCard({
  corpoComTexto,
  porqueTexto,
  onSubmit,
  carregando,
  erro,
}: ReturnAfterPauseCardProps) {
  const [tarefa, setTarefa] = useState('');
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const handleSubmit = () => {
    const valor = tarefa.trim();
    if (!valor) {
      setErroValidacao(ERRO_CAMPO_VAZIO);
      return;
    }
    setErroValidacao(null);
    onSubmit(valor);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.corpo}>{corpoComTexto}</Text>
      {porqueTexto ? (
        <View style={styles.blockquote}>
          <Text style={styles.porqueTexto}>“{porqueTexto}”</Text>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={tarefa}
        onChangeText={texto => {
          setTarefa(texto);
          if (erroValidacao) {
            setErroValidacao(null);
          }
        }}
        placeholder="ex: guardar o celular na gaveta às 20h"
        placeholderTextColor={theme.colors.textSecondary}
        editable={!carregando}
      />
      {erroValidacao ? <Text style={styles.erro}>{erroValidacao}</Text> : null}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <PrimaryButton
        titulo="Voltar a começar"
        onPress={handleSubmit}
        desabilitado={carregando}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  corpo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.cobre,
    paddingLeft: theme.spacing.md,
  },
  porqueTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  erro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
  },
});
