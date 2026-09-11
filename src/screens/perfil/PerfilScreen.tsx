import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { usePerfil } from '../../hooks/usePerfil';
import { useAuth } from '../../hooks/useAuth';
import { useAccountDeletion } from '../../hooks/useAccountDeletion';
import { useVoltarParaAbaHoje } from '../../hooks/useVoltarParaAbaHoje';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { LinkExterno } from '../../components/common/LinkExterno';
import { ConfirmDeleteAccountModal } from '../../components/perfil/ConfirmDeleteAccountModal';
import { ReauthPromptModal } from '../../components/perfil/ReauthPromptModal';
import {
  ROTULO_POLITICA_PRIVACIDADE,
  ROTULO_TERMOS_DE_USO,
  URL_POLITICA_PRIVACIDADE,
  URL_TERMOS_DE_USO,
} from '../../config/legalLinks';

const DURACAO_FEEDBACK_SALVO_MS = 2000;
const HORARIO_PADRAO = '08:00';

interface PerfilScreenProps {
  uid: string;
  /** Abre a tela de configuração do bloqueio de apps (Fase 3, parte 2). */
  aoAbrirBloqueioApps: () => void;
  /**
   * Só em dev: abre a tela temporária de debug da detecção de apps (Fase 3,
   * parte 1). Ausente = o botão não aparece.
   */
  aoAbrirDebugAcessibilidade?: () => void;
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

export function PerfilScreen({
  uid,
  aoAbrirBloqueioApps,
  aoAbrirDebugAcessibilidade,
}: PerfilScreenProps) {
  useVoltarParaAbaHoje();

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
  const {
    excluirConta,
    precisaReautenticar,
    provedor,
    reautenticar,
    cancelarReautenticacao,
    carregando: exclusaoCarregando,
    erro: exclusaoErro,
  } = useAccountDeletion();

  const [textoPorque, setTextoPorque] = useState('');
  const [salvoVisivel, setSalvoVisivel] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

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
    const salvou = await salvarPorque(textoPorque);
    if (salvou) {
      setSalvoVisivel(true);
    }
  };

  const handleAlterarHorario = (evento: DateTimePickerEvent, data?: Date) => {
    setSeletorAberto(false);
    if (evento.type === 'set' && data) {
      alterarHorario(dateParaHorario(data));
    }
  };

  const handleConfirmarExclusao = () => {
    setConfirmacaoAberta(false);
    excluirConta();
  };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  // Exclusão em andamento — mas não enquanto o modal de reautenticação está
  // pedindo a senha (aí a tela precisa continuar montada por baixo do modal).
  if (exclusaoCarregando && !precisaReautenticar) {
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
              hitSlop={8}
              style={styles.linkToque}
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

        <Text style={styles.secaoTitulo}>Bloqueio de apps</Text>
        <Pressable
          accessibilityRole="button"
          onPress={aoAbrirBloqueioApps}
          hitSlop={8}
          style={styles.linkToque}
        >
          <Text style={styles.link}>Configurar bloqueio de apps</Text>
        </Pressable>

        <Text style={styles.secaoTitulo}>Sobre</Text>
        <LinkExterno url={URL_POLITICA_PRIVACIDADE} style={styles.linkLegal}>
          {ROTULO_POLITICA_PRIVACIDADE}
        </LinkExterno>
        <LinkExterno url={URL_TERMOS_DE_USO} style={styles.linkLegal}>
          {ROTULO_TERMOS_DE_USO}
        </LinkExterno>

        <Text style={styles.secaoTitulo}>Sair</Text>
        <PrimaryButton titulo="Sair" onPress={signOut} />

        <View style={styles.zonaExclusao}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmacaoAberta(true)}
            style={styles.botaoExcluirConta}
            hitSlop={8}
          >
            <Text style={styles.textoExcluirConta}>Excluir conta</Text>
          </Pressable>
          <Text style={styles.avisoExclusao}>
            Apaga sua conta e todo o progresso. Não dá pra desfazer.
          </Text>
        </View>

        {aoAbrirDebugAcessibilidade && (
          <Pressable
            accessibilityRole="button"
            onPress={aoAbrirDebugAcessibilidade}
            style={styles.debugLink}
            hitSlop={8}
          >
            <Text style={styles.debugTexto}>🔧 Debug: detecção de apps</Text>
          </Pressable>
        )}
      </ScrollView>

      <ConfirmDeleteAccountModal
        visible={confirmacaoAberta}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setConfirmacaoAberta(false)}
      />
      <ReauthPromptModal
        visible={precisaReautenticar}
        provedor={provedor}
        erro={exclusaoErro}
        carregando={exclusaoCarregando}
        onSubmit={reautenticar}
        onCancel={cancelarReautenticacao}
      />
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
  linkToque: {
    paddingVertical: theme.spacing.sm,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.musgo,
  },
  linkLegal: {
    fontSize: theme.typography.fontSize.md,
    paddingVertical: theme.spacing.xs,
  },
  zonaExclusao: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  botaoExcluirConta: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.erro,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  textoExcluirConta: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.erro,
  },
  avisoExclusao: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  debugLink: {
    marginTop: theme.spacing.xl,
    alignSelf: 'flex-start',
  },
  debugTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
