import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { StatusHistoricoDia } from '../../domain/progress';
import { DetalheRedesDoDia } from '../../domain/resumoRedes';
import { Tarefa } from '../../domain/types';

interface DayDetailSheetProps {
  visible: boolean;
  /** Ex: "Quarta-feira". */
  label: string;
  status: StatusHistoricoDia;
  tarefas: Tarefa[];
  /** Bloco "Nas redes" (HU-08, RN07) — ausente/null não mostra o bloco. */
  detalheRedes?: DetalheRedesDoDia | null;
  onClose: () => void;
}

// Dia com muitas tarefas/muitas intenções não pode empurrar o cartão pra
// fora da tela — trava a altura numa fração do frame e rola só o corpo,
// com título e "Fechar" sempre visíveis.
const FRACAO_ALTURA_MAXIMA = 0.85;

const LABEL_STATUS: Record<StatusHistoricoDia, string> = {
  cumprido: 'cumprido',
  protegido_escudo: 'protegido',
  perdido: 'perdido',
  pendente: 'pendente',
  sem_registro: 'sem registro',
};

/**
 * Detalhe read-only de um dia do histórico (ver ProgressoScreen) — mostra as
 * tarefas daquele dailyLog exatamente como ficaram, sem nenhum toggle
 * funcional (nem accessibilityRole="checkbox", pra não sugerir que dá pra
 * interagir). Componente burro: quem busca os dados é useDayDetail.
 */
export function DayDetailSheet({
  visible,
  label,
  status,
  tarefas,
  detalheRedes,
  onClose,
}: DayDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.fundo} onPress={onClose}>
        {/* trava a propagação do toque no cartão pro fundo não fechar */}
        <Pressable
          testID="day-detail-cartao"
          style={[
            styles.cartao,
            {
              maxHeight: frame.height * FRACAO_ALTURA_MAXIMA,
              paddingBottom: theme.spacing.xl + insets.bottom,
            },
          ]}
          onPress={() => {}}
        >
          <Text style={styles.titulo}>
            {label} · {LABEL_STATUS[status]}
          </Text>

          <ScrollView
            testID="day-detail-corpo-scroll"
            contentContainerStyle={styles.corpoScroll}
          >
            {tarefas.length === 0 ? (
              <Text style={styles.vazio}>Nenhuma tarefa registrada nesse dia.</Text>
            ) : (
              <View style={styles.lista}>
                {tarefas.map(tarefa => (
                  <View key={tarefa.id} style={styles.linha}>
                    <View
                      testID="day-detail-checkbox"
                      accessibilityLabel={
                        tarefa.concluida ? 'concluída' : 'não concluída'
                      }
                      style={[
                        styles.checkbox,
                        tarefa.concluida && styles.checkboxMarcado,
                      ]}
                    />
                    <Text
                      style={[
                        styles.tarefaTitulo,
                        tarefa.concluida && styles.tarefaTituloConcluida,
                      ]}
                    >
                      {tarefa.titulo}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {detalheRedes && (
              <View testID="day-detail-nas-redes" style={styles.blocoRedes}>
                <Text style={styles.eyebrowRedes}>Nas redes</Text>
                <View style={styles.linhaRedes}>
                  {detalheRedes.duracao && (
                    <Text style={styles.duracaoRedes}>{detalheRedes.duracao}</Text>
                  )}
                  <Text style={styles.contadoresRedes}>{detalheRedes.textoContadores}</Text>
                </View>
                {detalheRedes.topAppsTexto && (
                  <Text style={styles.topAppsRedes}>{detalheRedes.topAppsTexto}</Text>
                )}
                {detalheRedes.intencoes.length > 0 && (
                  <>
                    <View style={styles.divisorRedes} />
                    <Text style={styles.eyebrowRedes}>O que você escreveu na pausa</Text>
                    <Text style={styles.intencoesRedes}>
                      {detalheRedes.intencoes.map(texto => `“${texto}”`).join(' · ')}
                      {detalheRedes.intencoesExcedente > 0 ? ` · +${detalheRedes.intencoesExcedente}` : ''}
                    </Text>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.fechar}
          >
            <Text style={styles.fecharTexto}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  cartao: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  corpoScroll: {
    gap: theme.spacing.sm,
  },
  titulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  vazio: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  lista: {
    gap: theme.spacing.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  checkboxMarcado: {
    backgroundColor: theme.colors.musgo,
  },
  tarefaTitulo: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  tarefaTituloConcluida: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  blocoRedes: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  eyebrowRedes: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  linhaRedes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duracaoRedes: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  contadoresRedes: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  topAppsRedes: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  divisorRedes: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  intencoesRedes: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  fechar: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  fecharTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
