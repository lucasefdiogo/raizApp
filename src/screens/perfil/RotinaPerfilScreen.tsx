import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useRotina } from '../../hooks/useRotina';
import { useAcessoUso } from '../../hooks/useAcessoUso';
import { horarioPausaMaior, resumoRotina } from '../../domain/rotina';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { BackButton } from '../../components/common/BackButton';

const DURACAO_FEEDBACK_SALVO_MS = 2000;
const LIMITE_CARACTERES_ALTERNATIVA = 40;

// Ponto de partida editável quando ainda não há nenhuma estimativa (RN14) —
// a pessoa pode ajustar livremente antes de "Salvar".
const DORMIR_PADRAO = '23:00';
const ACORDAR_PADRAO = '07:00';

interface RotinaPerfilScreenProps {
  uid: string;
  onVoltar: () => void;
  /** Abre a divulgação do acesso de uso (HU-02), link "Medir tempo nas redes" (RN14). */
  aoAbrirMedirTempo: () => void;
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
 * Rotina noturna no Perfil (HU-06/HU-10, RN13/RN14/RN15). Horário e
 * alternativa ficam em rascunho local até "Salvar" — um só botão: grava o
 * horário (modoManual) só se ele mudou, e a alternativa só se ela mudou
 * (RN13). Sem rotina confirmada ainda, os mesmos campos partem de um
 * horário padrão editável e "Salvar" confirma pela primeira vez (RN14).
 * Tom de padrão identificado, nunca de regra imposta (RN20).
 */
export function RotinaPerfilScreen({
  uid,
  onVoltar,
  aoAbrirMedirTempo,
}: RotinaPerfilScreenProps) {
  const {
    carregando,
    rotina,
    diasComDados,
    confirmar,
    salvarAlternativa,
    editarHorarioManual,
    recalcularAutomaticamente,
  } = useRotina(uid);
  const { concedido: acessoUsoConcedido } = useAcessoUso();

  const [campoAberto, setCampoAberto] = useState<Campo | null>(null);
  const [dormirDraft, setDormirDraft] = useState(DORMIR_PADRAO);
  const [acordarDraft, setAcordarDraft] = useState(ACORDAR_PADRAO);
  const [alternativaDraft, setAlternativaDraft] = useState('');
  const [salvoVisivel, setSalvoVisivel] = useState(false);

  useEffect(() => {
    setDormirDraft(rotina?.dormirEstimado ?? DORMIR_PADRAO);
    setAcordarDraft(rotina?.acordarEstimado ?? ACORDAR_PADRAO);
    setAlternativaDraft(rotina?.alternativaNoturna ?? '');
  }, [rotina?.dormirEstimado, rotina?.acordarEstimado, rotina?.alternativaNoturna]);

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
      const horario = dateParaHorario(data);
      if (campo === 'dormirEstimado') {
        setDormirDraft(horario);
      } else {
        setAcordarDraft(horario);
      }
    }
  };

  const handleSalvar = async () => {
    if (!rotina?.confirmadoEm) {
      await confirmar({ dormirEstimado: dormirDraft, acordarEstimado: acordarDraft });
    } else {
      const camposAlterados: Partial<{ dormirEstimado: string; acordarEstimado: string }> = {};
      if (dormirDraft !== rotina.dormirEstimado) {
        camposAlterados.dormirEstimado = dormirDraft;
      }
      if (acordarDraft !== rotina.acordarEstimado) {
        camposAlterados.acordarEstimado = acordarDraft;
      }
      if (Object.keys(camposAlterados).length > 0) {
        await editarHorarioManual(camposAlterados);
      }
    }

    const alternativaAtual = rotina?.alternativaNoturna ?? '';
    if (alternativaDraft.trim() !== alternativaAtual) {
      await salvarAlternativa(alternativaDraft.trim());
    }
    setSalvoVisivel(true);
  };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  const confirmada = Boolean(rotina?.confirmadoEm);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <BackButton onPress={onVoltar} />
        <View style={styles.cabecalho}>
          <Text accessibilityRole="header" style={styles.titulo}>
            Rotina noturna
          </Text>
          {confirmada && (
            <Text style={styles.selo}>
              {rotina?.modoManual ? 'AJUSTADO À MÃO' : 'AUTOMÁTICO'}
            </Text>
          )}
        </View>

        {!confirmada && (
          <Text style={styles.nota}>
            {resumoRotina(rotina, diasComDados, acessoUsoConcedido, 'longa')}
          </Text>
        )}
        {!confirmada && !acessoUsoConcedido && (
          <Pressable
            accessibilityRole="button"
            onPress={aoAbrirMedirTempo}
            hitSlop={8}
            style={styles.alvo}
          >
            <Text style={styles.link}>Medir tempo nas redes</Text>
          </Pressable>
        )}

        <LinhaHorario
          rotulo={`Dormir: ${dormirDraft}`}
          acao="Alterar horário de dormir"
          onPress={() => setCampoAberto('dormirEstimado')}
        />
        <LinhaHorario
          rotulo={`Acordar: ${acordarDraft}`}
          acao="Alterar horário de acordar"
          onPress={() => setCampoAberto('acordarEstimado')}
        />
        {campoAberto && (
          <DateTimePicker
            value={horarioParaDate(campoAberto === 'dormirEstimado' ? dormirDraft : acordarDraft)}
            mode="time"
            is24Hour
            onChange={handleSeletor}
          />
        )}

        {confirmada && (
          <Text style={styles.nota}>
            Pausa maior entre {horarioPausaMaior(dormirDraft)} e {acordarDraft}, todos
            os dias.
          </Text>
        )}

        {rotina?.modoManual && (
          <Pressable
            accessibilityRole="button"
            onPress={recalcularAutomaticamente}
            hitSlop={8}
            style={styles.alvo}
          >
            <Text style={styles.link}>Recalcular automaticamente</Text>
          </Pressable>
        )}

        {confirmada && (
          <TextField
            label="No lugar da tela, à noite"
            value={alternativaDraft}
            onChangeText={setAlternativaDraft}
            maxLength={LIMITE_CARACTERES_ALTERNATIVA}
            multiline
          />
        )}

        <PrimaryButton titulo="Salvar" onPress={handleSalvar} />
        {salvoVisivel && <Text style={styles.nota}>Salvo</Text>}
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
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  titulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  selo: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
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
