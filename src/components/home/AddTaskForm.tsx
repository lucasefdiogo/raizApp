import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { TextField } from '../TextField';
import { PrimaryButton } from '../PrimaryButton';
import { ToggleIndicator } from '../common/ToggleIndicator';
import { TaskTypeToggle } from './TaskTypeToggle';
import { SUGESTOES_ALTERNATIVAS } from '../../domain/sugestoesAlternativas';
import { TipoTarefa } from '../../domain/types';

interface AddTaskFormProps {
  visible: boolean;
  onFechar: () => void;
  onAdicionar: (
    titulo: string,
    essencial: boolean,
    tipo: TipoTarefa,
    duracaoMinutos?: number,
    repetirTodosOsDias?: boolean,
  ) => void;
  limiteEssenciaisAtingido: boolean;
  essenciaisUsadas: number;
  /** `rotina.alternativaNoturna` (HU-06) — presente, entra como primeiro chip de sugestão (RN07). */
  alternativaNoturna: string | null;
}

/**
 * Sheet "Nova alternativa" (HU-07, RN06) — mesmo padrão de Modal controlado
 * de TaskActionsSheet/DayDetailSheet. Quem abre é a HomeScreen, tanto pelo
 * botão "Adicionar alternativa" quanto pelo CTA do EmptyState.
 */
export function AddTaskForm({
  visible,
  onFechar,
  onAdicionar,
  limiteEssenciaisAtingido,
  essenciaisUsadas,
  alternativaNoturna,
}: AddTaskFormProps) {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [essencial, setEssencial] = useState(false);
  const [tipo, setTipo] = useState<TipoTarefa>('padrao');
  const [duracaoMinutos, setDuracaoMinutos] = useState<number | null>(null);
  const [repetirTodosOsDias, setRepetirTodosOsDias] = useState(false);

  const podeMarcarEssencial = !limiteEssenciaisAtingido;
  const essencialEfetivo = essencial && podeMarcarEssencial;
  const tituloLimpo = titulo.trim();
  const sugestoes = alternativaNoturna
    ? [alternativaNoturna, ...SUGESTOES_ALTERNATIVAS]
    : SUGESTOES_ALTERNATIVAS;

  function limpar() {
    setTitulo('');
    setEssencial(false);
    setTipo('padrao');
    setDuracaoMinutos(null);
    setRepetirTodosOsDias(false);
  }

  function adicionar() {
    if (tituloLimpo.length === 0) {
      return;
    }
    onAdicionar(
      tituloLimpo,
      essencialEfetivo,
      tipo,
      tipo === 'exercicio' && duracaoMinutos !== null
        ? duracaoMinutos
        : undefined,
      repetirTodosOsDias,
    );
    limpar();
    onFechar();
  }

  function fechar() {
    limpar();
    onFechar();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={fechar}
    >
      <Pressable style={styles.fundo} onPress={fechar}>
        {/* trava a propagação do toque no cartão pro fundo não fechar */}
        <Pressable style={styles.cartao} onPress={() => {}}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.conteudo,
              { paddingBottom: theme.spacing.xl + insets.bottom },
            ]}
          >
          <TextField
            label="Nova alternativa"
            labelStyle={styles.tituloSheet}
            placeholder="O que você faria em vez de abrir o feed?"
            value={titulo}
            onChangeText={setTitulo}
            onSubmitEditing={adicionar}
            returnKeyType="done"
          />

          <View style={styles.chips}>
            {sugestoes.map((sugestao, indice) => (
              <Pressable
                key={`${sugestao}-${indice}`}
                accessibilityRole="button"
                onPress={() => setTitulo(sugestao)}
                style={[
                  styles.chip,
                  indice === 0 && alternativaNoturna && styles.chipNoturno,
                ]}
              >
                <Text style={styles.chipTexto}>{sugestao}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Essencial"
            accessibilityState={{
              checked: essencialEfetivo,
              disabled: !podeMarcarEssencial,
            }}
            disabled={!podeMarcarEssencial}
            onPress={() => setEssencial(atual => !atual)}
            style={styles.linhaEssencial}
          >
            <View style={styles.textoEssencial}>
              <Text
                style={[
                  styles.rotuloEssencial,
                  !podeMarcarEssencial && styles.rotuloDesabilitado,
                ]}
              >
                Essencial
              </Text>
              <Text style={styles.aviso}>
                {podeMarcarEssencial
                  ? `${essenciaisUsadas} de 3 usadas hoje`
                  : 'Você já tem 3 essenciais hoje.'}
              </Text>
            </View>
            <ToggleIndicator ativo={essencialEfetivo} />
          </Pressable>

          <TaskTypeToggle
            tipo={tipo}
            duracaoMinutos={duracaoMinutos}
            onChangeTipo={setTipo}
            onChangeDuracao={setDuracaoMinutos}
          />

          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Repetir todos os dias"
            accessibilityState={{ checked: repetirTodosOsDias }}
            onPress={() => setRepetirTodosOsDias(atual => !atual)}
            style={styles.linhaRepetir}
          >
            <Text style={styles.rotuloRepetir}>Repetir todos os dias</Text>
            <ToggleIndicator ativo={repetirTodosOsDias} />
          </Pressable>

          <PrimaryButton
            titulo="Adicionar"
            onPress={adicionar}
            desabilitado={tituloLimpo.length === 0}
          />

          <Pressable
            accessibilityRole="button"
            onPress={fechar}
            style={styles.cancelar}
          >
            <Text style={styles.cancelarTexto}>Cancelar</Text>
          </Pressable>
          </ScrollView>
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
  // maxHeight evita que o sheet ultrapasse a tela em telas pequenas ou com
  // o teclado aberto — o ScrollView interno garante que "Adicionar"/
  // "Cancelar" continuem alcançáveis mesmo com todos os campos abertos
  // (sugestões + essencial + tipo/duração + repetir).
  cartao: {
    backgroundColor: theme.colors.casca,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '85%',
  },
  conteudo: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  // "Nova alternativa" faz vez de título do sheet (protótipo HU-07, tela
  // 07.3) — por isso sobrescreve o label padrão do TextField pra ficar no
  // mesmo peso/tamanho dos outros headlines da Home (ver HomeScreen.styles.headline).
  tituloSheet: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  chipNoturno: {
    borderColor: theme.colors.musgo,
  },
  chipTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  linhaEssencial: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  textoEssencial: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  rotuloEssencial: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  rotuloDesabilitado: {
    color: theme.colors.textSecondary,
  },
  aviso: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  linhaRepetir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  rotuloRepetir: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  cancelar: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  cancelarTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
