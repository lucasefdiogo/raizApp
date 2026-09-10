import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { usePerfil } from '../../hooks/usePerfil';
import { useAuth } from '../../hooks/useAuth';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';

const DURACAO_FEEDBACK_SALVO_MS = 2000;
const HORARIO_PADRAO = '08:00';

interface PerfilScreenProps {
  uid: string;
}

function horarioParaDate(horario: string | null): Date {
  const [horas, minutos] = (horario ?? HORARIO_PADRAO).split(':').map(Number);
  const data = new Date();
  data.setHours(horas, minutos, 0, 0);
  return data;
}

function dateParaHorario(data: Date): string {
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function PerfilScreen({ uid }: PerfilScreenProps) {
  const {
    porqueTexto,
    notificacoesAtivas,
    horarioLembreteDiario,
    salvarPorque,
    alternarNotificacoes,
    alterarHorario,
    carregando,
  } = usePerfil(uid);
  const { signOut } = useAuth();

  const [textoPorque, setTextoPorque] = useState('');
  const [salvoVisivel, setSalvoVisivel] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);

  useEffect(() => {
    setTextoPorque(porqueTexto);
  }, [porqueTexto]);

  useEffect(() => {
    if (!salvoVisivel) {
      return;
    }
    const temporizador = setTimeout(
      () => setSalvoVisivel(false),
      DURACAO_FEEDBACK_SALVO_MS,
    );
    return () => clearTimeout(temporizador);
  }, [salvoVisivel]);

  const handleSalvarPorque = async () => {
    await salvarPorque(textoPorque);
    setSalvoVisivel(true);
  };

  const handleAlterarHorario = (evento: DateTimePickerEvent, data?: Date) => {
    setSeletorAberto(false);
    if (evento.type === 'set' && data) {
      alterarHorario(dateParaHorario(data));
    }
  };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.secaoTitulo}>Seu porquê</Text>
        <TextField
          label="Por que você quer estar aqui"
          value={textoPorque}
          onChangeText={setTextoPorque}
          multiline
        />
        <PrimaryButton titulo="Salvar" onPress={handleSalvarPorque} />
        {salvoVisivel && <Text style={styles.feedbackSalvo}>Salvo</Text>}

        <Text style={styles.secaoTitulo}>Notificações</Text>
        <View style={styles.linhaToggle}>
          <Text style={styles.rotulo}>Lembrete diário</Text>
          <Switch
            value={notificacoesAtivas}
            onValueChange={alternarNotificacoes}
            trackColor={{ false: theme.colors.border, true: theme.colors.cobre }}
          />
        </View>
        {notificacoesAtivas && (
          <View style={styles.linhaHorario}>
            <Text style={styles.rotulo}>
              Horário: {horarioLembreteDiario ?? 'não definido'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSeletorAberto(true)}
            >
              <Text style={styles.link}>Alterar horário</Text>
            </Pressable>
          </View>
        )}
        {seletorAberto && (
          <DateTimePicker
            value={horarioParaDate(horarioLembreteDiario)}
            mode="time"
            is24Hour
            onChange={handleAlterarHorario}
          />
        )}

        <Text style={styles.secaoTitulo}>Sair</Text>
        <PrimaryButton titulo="Sair" onPress={signOut} />
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
  secaoTitulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  feedbackSalvo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgo,
  },
  linhaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linhaHorario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.musgo,
  },
});
