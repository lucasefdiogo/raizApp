import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useRotina } from '../../hooks/useRotina';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { BackButton } from '../../components/common/BackButton';

const DURACAO_FEEDBACK_SALVO_MS = 2000;

interface RotinaPerfilScreenProps {
  uid: string;
  onVoltar: () => void;
}

type Campo = 'dormirEstimado' | 'acordarEstimado';

function horarioParaDate(horario: string): Date {
  const [horas, minutos] = horario.split(':').map(Number);
  const data = new Date();
  data.setHours(horas, minutos, 0, 0);
  return data;
}

function dateParaHorario(data: Date): string {
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Rotina noturna no Perfil (HU-06, RN-12): editar dormir/acordar, voltar ao
 * cálculo automático e editar a alternativa noturna. Tom de padrão
 * identificado, nunca de regra imposta (RN-13).
 */
export function RotinaPerfilScreen({ uid, onVoltar }: RotinaPerfilScreenProps) {
  const {
    carregando,
    rotina,
    salvarAlternativa,
    editarHorarioManual,
    recalcularAutomaticamente,
  } = useRotina(uid);

  const [campoAberto, setCampoAberto] = useState<Campo | null>(null);
  const [alternativa, setAlternativa] = useState('');
  const [salvoVisivel, setSalvoVisivel] = useState(false);

  const alternativaSalva = rotina?.alternativaNoturna ?? '';
  useEffect(() => {
    setAlternativa(alternativaSalva);
  }, [alternativaSalva]);

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

  const handleSeletor = (evento: DateTimePickerEvent, data?: Date) => {
    const campo = campoAberto;
    setCampoAberto(null);
    if (campo && evento.type === 'set' && data) {
      editarHorarioManual({ [campo]: dateParaHorario(data) });
    }
  };

  const handleSalvarAlternativa = async () => {
    await salvarAlternativa(alternativa.trim());
    setSalvoVisivel(true);
  };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <BackButton onPress={onVoltar} />
        <Text accessibilityRole="header" style={styles.titulo}>
          Rotina noturna
        </Text>

        {rotina ? (
          <>
            <LinhaHorario
              rotulo={`Dormir: ${rotina.dormirEstimado}`}
              acao="Alterar horário de dormir"
              onPress={() => setCampoAberto('dormirEstimado')}
            />
            <LinhaHorario
              rotulo={`Acordar: ${rotina.acordarEstimado}`}
              acao="Alterar horário de acordar"
              onPress={() => setCampoAberto('acordarEstimado')}
            />
            {campoAberto && (
              <DateTimePicker
                value={horarioParaDate(rotina[campoAberto])}
                mode="time"
                is24Hour
                onChange={handleSeletor}
              />
            )}
            {rotina.modoManual && (
              <>
                <Text style={styles.nota}>Horários ajustados por você</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Recalcular automaticamente"
                  onPress={recalcularAutomaticamente}
                  hitSlop={8}
                  style={styles.alvo}
                >
                  <Text style={styles.link}>Recalcular automaticamente</Text>
                </Pressable>
              </>
            )}

            <TextField
              label="Alternativa noturna"
              value={alternativa}
              onChangeText={setAlternativa}
              multiline
            />
            <PrimaryButton titulo="Salvar" onPress={handleSalvarAlternativa} />
            {salvoVisivel && <Text style={styles.nota}>Salvo</Text>}
          </>
        ) : (
          <Text style={styles.nota}>
            A rotina aparece aqui depois de alguns dias de uso. Não precisa
            fazer nada por enquanto.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaHorario({
  rotulo,
  acao,
  onPress,
}: {
  rotulo: string;
  acao: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={acao}
        onPress={onPress}
        hitSlop={8}
        style={styles.alvo}
      >
        <Text style={styles.link}>Alterar</Text>
      </Pressable>
    </View>
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
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rotulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  nota: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  alvo: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  link: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgo,
  },
});
