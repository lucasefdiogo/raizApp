import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { BackButton } from '../../components/common/BackButton';
import type { RootStackParamList } from '../../navigation/RootNavigator';

interface ForgotPasswordScreenProps {
  resetPassword: (email: string) => Promise<void>;
}

type Navegacao = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({
  resetPassword,
}: ForgotPasswordScreenProps) {
  const navigation = useNavigation<Navegacao>();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const podeEnviar = email.trim().length > 0 && !enviando;

  const handleEnviar = async () => {
    if (!podeEnviar) {
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await resetPassword(email.trim());
      setEnviado(true);
    } catch (erroCapturado) {
      setErro((erroCapturado as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.titulo}>Recuperar senha</Text>

        {enviado ? (
          <Text style={styles.mensagemNeutra}>
            Se esse e-mail tiver uma conta, você vai receber um link em
            alguns minutos.
          </Text>
        ) : (
          <>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {erro && <Text style={styles.erro}>{erro}</Text>}

            <PrimaryButton
              titulo="Enviar link de recuperação"
              onPress={handleEnviar}
              desabilitado={!podeEnviar}
            />
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('SignIn')}
          hitSlop={8}
          style={styles.linkToque}
        >
          <Text style={styles.link}>Voltar para o login</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  conteudo: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  erro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
  },
  mensagemNeutra: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  linkToque: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.musgo,
    textAlign: 'center',
  },
});
