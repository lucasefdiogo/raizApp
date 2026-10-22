import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { LuaDecorativa } from '../../components/rotina/LuaDecorativa';

interface Horarios {
  dormirEstimado: string;
  acordarEstimado: string;
}

interface RotinaConfirmacaoScreenProps extends Horarios {
  /** Sem argumento = confirma a estimativa como veio; com argumento = horários ajustados. */
  onConfirmar: (horarios?: Horarios) => void;
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
 * Confirmação única da rotina estimada (HU-06, RN-04). "Ajustar horário"
 * deixa editar dormir e acordar antes de confirmar. Tom de padrão
 * identificado, nunca de regra imposta (RN-13).
 */
export function RotinaConfirmacaoScreen({
  dormirEstimado,
  acordarEstimado,
  onConfirmar,
}: RotinaConfirmacaoScreenProps) {
  const [horarios, setHorarios] = useState<Horarios>({
    dormirEstimado,
    acordarEstimado,
  });
  const [ajustando, setAjustando] = useState(false);
  const [ajustado, setAjustado] = useState(false);
  const [campoAberto, setCampoAberto] = useState<Campo | null>(null);

  const handleSeletor = (evento: DateTimePickerEvent, data?: Date) => {
    const campo = campoAberto;
    setCampoAberto(null);
    if (campo && evento.type === 'set' && data) {
      setHorarios(atual => ({ ...atual, [campo]: dateParaHorario(data) }));
      setAjustado(true);
    }
  };

  return (
    <View
      style={styles.conteudo}
      testID="rotina-confirmacao"
      accessibilityLabel="Confirmar rotina estimada"
    >
      <LuaDecorativa />
      <Text accessibilityRole="header" style={styles.titulo}>
        Notamos um padrão
      </Text>
      <Text style={styles.corpo}>
        Parece que você costuma dormir perto desse horário. Isso ajuda a ajustar
        a janela noturna.
      </Text>
      <Text
        style={styles.horario}
        accessible
        accessibilityLabel={`Horário estimado de dormir: ${horarios.dormirEstimado}`}
      >
        {horarios.dormirEstimado}
      </Text>

      {ajustando && (
        <View style={styles.ajuste}>
          <LinhaHorario
            rotulo={`Dormir: ${horarios.dormirEstimado}`}
            acao="Alterar horário de dormir"
            onPress={() => setCampoAberto('dormirEstimado')}
          />
          <LinhaHorario
            rotulo={`Acordar: ${horarios.acordarEstimado}`}
            acao="Alterar horário de acordar"
            onPress={() => setCampoAberto('acordarEstimado')}
          />
        </View>
      )}
      {campoAberto && (
        <DateTimePicker
          value={horarioParaDate(horarios[campoAberto])}
          mode="time"
          is24Hour
          onChange={handleSeletor}
        />
      )}

      <View style={styles.acoes}>
        <PrimaryButton
          titulo="Confirmar"
          onPress={() => (ajustado ? onConfirmar(horarios) : onConfirmar())}
        />
        {!ajustando && (
          <SecondaryButton
            titulo="Ajustar horário"
            onPress={() => setAjustando(true)}
          />
        )}
      </View>
    </View>
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
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
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
  horario: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textPrimary,
  },
  ajuste: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
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
  alvo: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.accent,
  },
  acoes: {
    alignSelf: 'stretch',
    gap: theme.spacing.md,
  },
});
