import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen } from 'lucide-react-native';
import { theme } from '../../theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface AlternativaNoturnaScreenProps {
  onSalvar: (texto: string) => void;
  /** "Agora não": não grava nada e a pergunta não volta (RN-06/RN11). */
  onAgoraNao: () => void;
}

const LIMITE_CARACTERES = 40;

// No Android com edge-to-edge (RN 0.87+) o `adjustResize` não encolhe mais a
// janela — o teclado entra por cima do campo e dos botões. Mesmo fix de
// SignUpScreen/HomeScreen: acompanha a altura do teclado à mão e cria
// espaço equivalente no fim do ScrollView, depois rola até lá.
const ATRASO_SCROLL_TECLADO_MS = 50;

const SUGESTOES = [
  'Ler um pouco',
  'Preparar o dia de amanhã',
  'Alongar',
  'Escrever 3 linhas',
];

/**
 * Pergunta única, opcional, sobre o que a pessoa gostaria de fazer à noite
 * no lugar das redes (HU-06/HU-10, RN11). Editável depois no Perfil. Os
 * chips só preenchem o campo — quem grava é sempre o "Salvar".
 */
export function AlternativaNoturnaScreen({
  onSalvar,
  onAgoraNao,
}: AlternativaNoturnaScreenProps) {
  const [texto, setTexto] = useState('');
  const vazio = texto.trim().length === 0;
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const aoMostrar = Keyboard.addListener('keyboardDidShow', evento => {
      setAlturaTeclado(evento.endCoordinates.height);
    });
    const aoEsconder = Keyboard.addListener('keyboardDidHide', () => {
      setAlturaTeclado(0);
    });
    return () => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, []);

  useEffect(() => {
    if (alturaTeclado === 0) {
      return;
    }
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, ATRASO_SCROLL_TECLADO_MS);
    return () => clearTimeout(id);
  }, [alturaTeclado]);

  const handleSalvar = () => {
    onSalvar(texto.trim());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        testID="alternativa-noturna-scroll"
        contentContainerStyle={[
          styles.conteudo,
          alturaTeclado > 0 && {
            paddingBottom: alturaTeclado + theme.spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Alternativa para a janela noturna"
      >
        <BookOpen size={28} color={theme.colors.musgo} />
        <Text accessibilityRole="header" style={styles.titulo}>
          O que você gostaria de fazer à noite?
        </Text>
        <Text style={styles.corpo}>
          Se bater a vontade de rolar a tela perto da hora de dormir, a gente
          lembra disso.
        </Text>
        <TextField
          label="Alternativa noturna (opcional)"
          placeholder="Ex.: ler, ouvir um podcast"
          value={texto}
          onChangeText={setTexto}
          maxLength={LIMITE_CARACTERES}
          returnKeyType="done"
        />
        <View style={styles.chips}>
          {SUGESTOES.map(sugestao => (
            <Pressable
              key={sugestao}
              accessibilityRole="button"
              onPress={() => setTexto(sugestao)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressionado]}
            >
              <Text style={styles.chipTexto}>{sugestao}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.acoes}>
          <PrimaryButton
            titulo="Salvar"
            onPress={handleSalvar}
            desabilitado={vazio}
          />
          <SecondaryButton titulo="Agora não" onPress={onAgoraNao} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    alignItems: 'center',
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  chipPressionado: {
    opacity: 0.7,
  },
  chipTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  acoes: {
    alignSelf: 'stretch',
    gap: theme.spacing.md,
  },
});
