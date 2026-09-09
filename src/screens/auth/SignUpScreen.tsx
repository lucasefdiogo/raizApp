import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { RootStackParamList } from '../../navigation/RootNavigator';

interface SignUpScreenProps {
  signUp: (email: string, senha: string) => Promise<void>;
}

type Navegacao = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

export function SignUpScreen({ signUp }: SignUpScreenProps) {
  const navigation = useNavigation<Navegacao>();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeCriar =
    email.trim().length > 0 && senha.length > 0 && confirmarSenha.length > 0 && !enviando;

  const handleCriarConta = async () => {
    if (!podeCriar) {
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await signUp(email.trim(), senha);
    } catch (erroCapturado) {
      setErro((erroCapturado as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Criar conta</Text>

        <View style={styles.campos}>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />
          <TextField
            label="Confirmar senha"
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            secureTextEntry
          />
        </View>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <PrimaryButton
          titulo="Criar conta"
          onPress={handleCriarConta}
          desabilitado={!podeCriar}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.link}>Já tem conta? Entrar</Text>
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
  campos: {
    gap: theme.spacing.md,
  },
  erro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.musgo,
    textAlign: 'center',
  },
});
