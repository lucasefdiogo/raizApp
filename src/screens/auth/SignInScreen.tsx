import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { BackButton } from '../../components/common/BackButton';
import type { RootStackParamList } from '../../navigation/RootNavigator';

interface SignInScreenProps {
  signIn: (email: string, senha: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /**
   * SignIn é raiz da AuthStack — não tem "voltar" de navegação normal, mas
   * chegou aqui vindo do Tutorial. Ausente = o chevron não aparece (não
   * deveria faltar em produção; só é opcional pra facilitar teste isolado).
   */
  aoVoltarParaTutorial?: () => void;
}

type Navegacao = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export function SignInScreen({
  signIn,
  signInWithGoogle,
  aoVoltarParaTutorial,
}: SignInScreenProps) {
  const navigation = useNavigation<Navegacao>();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeEntrar = email.trim().length > 0 && senha.length > 0 && !enviando;

  const handleEntrar = async () => {
    if (!podeEntrar) {
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await signIn(email.trim(), senha);
    } catch (erroCapturado) {
      setErro((erroCapturado as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const handleGoogle = async () => {
    if (enviando) {
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await signInWithGoogle();
    } catch (erroCapturado) {
      setErro((erroCapturado as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        {aoVoltarParaTutorial && <BackButton onPress={aoVoltarParaTutorial} />}
        <Text style={styles.titulo}>Entrar</Text>

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
        </View>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <PrimaryButton
          titulo="Entrar"
          onPress={handleEntrar}
          desabilitado={!podeEntrar}
        />

        <View style={styles.links}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('SignUp')}
            hitSlop={8}
            style={styles.linkToque}
          >
            <Text style={styles.link}>Ainda não tem conta? Criar conta</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={8}
            style={styles.linkToque}
          >
            <Text style={styles.link}>Esqueci minha senha</Text>
          </Pressable>
        </View>

        <View style={styles.divisorContainer}>
          <View style={styles.divisorLinha} />
          <Text style={styles.divisorTexto}>ou</Text>
          <View style={styles.divisorLinha} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleGoogle}
          disabled={enviando}
          style={styles.botaoGoogle}
        >
          <Text style={styles.botaoGoogleTexto}>Continuar com Google</Text>
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
  links: {
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  linkToque: {
    paddingVertical: theme.spacing.sm,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.musgo,
  },
  divisorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  divisorLinha: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  divisorTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  botaoGoogle: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  botaoGoogleTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
