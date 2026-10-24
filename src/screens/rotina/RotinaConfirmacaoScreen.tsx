import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { horarioPausaMaior, horariosRotinaValidos } from '../../domain/rotina';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { LuaDecorativa } from '../../components/rotina/LuaDecorativa';
import { useVoltarFisico } from '../../hooks/useVoltarFisico';

interface Horarios {
  dormirEstimado: string;
  acordarEstimado: string;
}

interface RotinaConfirmacaoScreenProps extends Horarios {
  /** Sem argumento = confirma a estimativa como veio; com argumento = horários ajustados. */
  onConfirmar: (horarios?: Horarios) => void;
  /** Voltar físico (HU-10, RN09): sai sem gravar, só volta amanhã. */
  onAdiar: () => void;
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
 * Confirmação única da rotina estimada (HU-06/HU-10, RN04/RN05). "Ajustar
 * horário" deixa editar dormir e acordar antes de confirmar (RN07), com a
 * linha da janela recalculada ao vivo. Tom de padrão identificado, nunca de
 * regra imposta (RN05/RN20).
 */
export function RotinaConfirmacaoScreen({
  dormirEstimado,
  acordarEstimado,
  onConfirmar,
  onAdiar,
}: RotinaConfirmacaoScreenProps) {
  const [horarios, setHorarios] = useState<Horarios>({
    dormirEstimado,
    acordarEstimado,
  });
  const [ajustando, setAjustando] = useState(false);
  const [ajustado, setAjustado] = useState(false);
  const [campoAberto, setCampoAberto] = useState<Campo | null>(null);

  useVoltarFisico(onAdiar);

  const valido = horariosRotinaValidos(
    horarios.dormirEstimado,
    horarios.acordarEstimado,
  );

  const handleSeletor = (evento: DateTimePickerEvent, data?: Date) => {
    const campo = campoAberto;
    setCampoAberto(null);
    if (campo && evento.type === 'set' && data) {
      setHorarios(atual => ({ ...atual, [campo]: dateParaHorario(data) }));
      setAjustado(true);
    }
  };

  const handleUsarEstimado = () => {
    setHorarios({ dormirEstimado, acordarEstimado });
    setAjustado(false);
    setAjustando(false);
  };

  const handleConfirmar = () => {
    if (ajustado) {
      onConfirmar(horarios);
    } else {
      onConfirmar();
    }
  };

  return (
    <SafeAreaView
      style={styles.conteudo}
      testID="rotina-confirmacao"
      accessibilityLabel="Confirmar rotina estimada"
    >
      <LuaDecorativa />
      <Text style={styles.eyebrow}>
        {ajustando ? 'AJUSTAR HORÁRIO' : 'PADRÃO IDENTIFICADO'}
      </Text>
      <Text accessibilityRole="header" style={styles.titulo}>
        {ajustando
          ? 'Quando você costuma dormir e acordar?'
          : `Parece que você costuma dormir por volta das ${dormirEstimado}.`}
      </Text>
      {!ajustando && (
        <Text style={styles.corpo}>
          Olhamos só os horários em que o celular foi usado nos últimos dias.
          Nada do que você viu ou digitou.
        </Text>
      )}

      {!ajustando && (
        <Text
          style={styles.horario}
          accessible
          accessibilityLabel={`Horário estimado de dormir: ${dormirEstimado}`}
        >
          {dormirEstimado}
        </Text>
      )}

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

      {valido ? (
        <Text style={styles.janela}>
          Entre {horarioPausaMaior(horarios.dormirEstimado)} e{' '}
          {horarios.acordarEstimado}, abrir as redes vai pedir uma pausa um
          pouco maior.
        </Text>
      ) : (
        <Text style={styles.erro}>
          Os horários de dormir e acordar precisam ser diferentes.
        </Text>
      )}

      <View style={styles.acoes}>
        <PrimaryButton
          titulo="Confirmar"
          onPress={handleConfirmar}
          desabilitado={!valido}
        />
        {!ajustando && (
          <SecondaryButton
            titulo="Ajustar horário"
            onPress={() => setAjustando(true)}
          />
        )}
        {ajustando && (
          <Pressable
            accessibilityRole="button"
            onPress={handleUsarEstimado}
            hitSlop={8}
            style={styles.alvo}
          >
            <Text style={styles.link}>Usar o horário estimado</Text>
          </Pressable>
        )}
      </View>
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
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
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
  janela: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  erro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
    textAlign: 'center',
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
