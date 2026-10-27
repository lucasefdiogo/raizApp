import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Bell, Lock, Moon } from 'lucide-react-native';
import { theme } from '../../theme';
import { usePerfil } from '../../hooks/usePerfil';
import { useAuth } from '../../hooks/useAuth';
import { useAccountDeletion } from '../../hooks/useAccountDeletion';
import { useVoltarParaAbaHoje } from '../../hooks/useVoltarParaAbaHoje';
import { useFeatureTour } from '../../hooks/useFeatureTour';
import { useAccessibilityPermission } from '../../hooks/useAccessibilityPermission';
import { useRegrasBloqueio } from '../../hooks/useRegrasBloqueio';
import { useRotina } from '../../hooks/useRotina';
import { useAcessoUso } from '../../hooks/useAcessoUso';
import { resumoCurtoBloqueio } from '../../domain/appBlock';
import { resumoRotina } from '../../domain/rotina';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { ToggleIndicator } from '../../components/common/ToggleIndicator';
import { LinkExterno } from '../../components/common/LinkExterno';
import { ConfirmDeleteAccountModal } from '../../components/perfil/ConfirmDeleteAccountModal';
import { ReauthPromptModal } from '../../components/perfil/ReauthPromptModal';
import {
  ROTULO_POLITICA_PRIVACIDADE,
  ROTULO_TERMOS_DE_USO,
  URL_POLITICA_PRIVACIDADE,
  URL_TERMOS_DE_USO,
} from '../../config/legalLinks';
import {
  MOSTRAR_SEMEAR_DESAFIO_REDUCAO,
  MOSTRAR_TESTAR_CRASHLYTICS,
} from '../../config/debugFlags';

const DURACAO_FEEDBACK_SALVO_MS = 2000;
const HORARIO_PADRAO = '08:00';

interface PerfilScreenProps {
  uid: string;
  aoAbrirBloqueioApps: () => void;
  /** Abre a rotina noturna (HU-06, RN-12). Ausente = a linha não aparece. */
  aoAbrirRotina?: () => void;
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
  aoAbrirRotina,
}: PerfilScreenProps) {
  useVoltarParaAbaHoje();
  const { reiniciar: reiniciarTourFuncionalidades } = useFeatureTour();

  const {
    porqueTexto,
    notificacoesAtivas,
    horarioLembreteDiario,
    salvarPorque,
    alternarNotificacoes,
    alterarHorario,
    carregando,
    testarCrash,
    semearDesafioReducaoConcluido,
    semearDesafioReducaoExpirado,
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
  const { ativo: servicoAtivo } = useAccessibilityPermission();
  const { regrasVigentes } = useRegrasBloqueio(uid);
  const { rotina, diasComDados } = useRotina(uid);
  const { concedido: acessoUsoConcedido } = useAcessoUso();

  const [textoPorque, setTextoPorque] = useState('');
  const [salvoVisivel, setSalvoVisivel] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [editandoPorque, setEditandoPorque] = useState(false);

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

  // Sem porquê cadastrado, o campo aparece direto (RN14) — não há citação
  // vazia pra editar.
  const mostrarCampoPorque = editandoPorque || !porqueTexto;

  const textoBloqueio = !regrasVigentes
    ? 'Não configurado'
    : servicoAtivo
      ? `Ativo · ${resumoCurtoBloqueio(regrasVigentes)}`
      : 'Desativado';

  const textoRotinaCurta = resumoRotina(rotina, diasComDados, acessoUsoConcedido, 'curta');

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
        {mostrarCampoPorque ? (
          <>
            <TextField
              label="Por que você quer estar aqui"
              value={textoPorque}
              onChangeText={setTextoPorque}
              multiline
            />
            <PrimaryButton titulo="Salvar" onPress={handleSalvarPorque} />
            {salvoVisivel && <Text style={styles.feedbackSalvo}>Salvo</Text>}
          </>
        ) : (
          <View style={styles.citacao}>
            <View style={styles.citacaoBarra} />
            <View style={styles.citacaoConteudo}>
              <Text style={styles.citacaoTexto}>{porqueTexto}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEditandoPorque(true)}
                hitSlop={8}
                style={styles.linkToque}
              >
                <Text style={styles.link}>Editar</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bloqueio de apps"
          onPress={aoAbrirBloqueioApps}
          hitSlop={8}
          style={styles.linhaNav}
        >
          <Lock size={18} color={theme.colors.textSecondary} />
          <View style={styles.linhaNavTextos}>
            <Text style={styles.linhaNavTitulo}>Bloqueio de apps</Text>
            <Text style={styles.linhaNavSubtitulo}>{textoBloqueio}</Text>
          </View>
        </Pressable>

        {aoAbrirRotina && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rotina noturna"
            onPress={aoAbrirRotina}
            hitSlop={8}
            style={styles.linhaNav}
          >
            <Moon size={18} color={theme.colors.textSecondary} />
            <View style={styles.linhaNavTextos}>
              <Text style={styles.linhaNavTitulo}>Rotina noturna</Text>
              <Text style={styles.linhaNavSubtitulo}>{textoRotinaCurta}</Text>
            </View>
          </Pressable>
        )}

        <View style={styles.linhaNavComToggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lembrete diário"
            onPress={() => notificacoesAtivas && setSeletorAberto(true)}
            hitSlop={8}
            style={styles.linhaNavToque}
          >
            <Bell size={18} color={theme.colors.textSecondary} />
            <View style={styles.linhaNavTextos}>
              <Text style={styles.linhaNavTitulo}>Lembrete diário</Text>
              {notificacoesAtivas && (
                <Text style={styles.linhaNavSubtitulo}>
                  {horarioLembreteDiario ?? 'não definido'}
                </Text>
              )}
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Lembrete diário"
            accessibilityState={{ checked: notificacoesAtivas }}
            onPress={() => alternarNotificacoes(!notificacoesAtivas)}
            hitSlop={8}
          >
            <ToggleIndicator ativo={notificacoesAtivas} />
          </Pressable>
        </View>
        {seletorAberto && (
          <DateTimePicker
            value={horarioParaDate(horarioLembreteDiario)}
            mode="time"
            is24Hour
            onChange={handleAlterarHorario}
          />
        )}

        <Text style={styles.secaoTitulo}>Sobre</Text>
        <Pressable
          accessibilityRole="button"
          onPress={reiniciarTourFuncionalidades}
          hitSlop={8}
          style={styles.linkToque}
        >
          <Text style={styles.link}>Ver tutorial novamente</Text>
        </Pressable>
        <LinkExterno url={URL_POLITICA_PRIVACIDADE} style={styles.linkLegal}>
          {ROTULO_POLITICA_PRIVACIDADE}
        </LinkExterno>
        <LinkExterno url={URL_TERMOS_DE_USO} style={styles.linkLegal}>
          {ROTULO_TERMOS_DE_USO}
        </LinkExterno>

        <SecondaryButton titulo="Sair" onPress={signOut} />

        <View style={styles.zonaExclusao}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmacaoAberta(true)}
            hitSlop={8}
            style={styles.linkToque}
          >
            <Text style={styles.textoExcluirConta}>Excluir conta</Text>
          </Pressable>
          <Text style={styles.avisoExclusao}>
            Apaga sua conta e todo o progresso. Não dá pra desfazer.
          </Text>
        </View>

        {(__DEV__ || MOSTRAR_TESTAR_CRASHLYTICS) && (
          <Pressable
            accessibilityRole="button"
            onPress={testarCrash}
            style={styles.debugLink}
            hitSlop={8}
          >
            <Text style={styles.debugTexto}>🔧 Testar Crashlytics</Text>
          </Pressable>
        )}

        {(__DEV__ || MOSTRAR_SEMEAR_DESAFIO_REDUCAO) && (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={semearDesafioReducaoConcluido}
              style={styles.debugLink}
              hitSlop={8}
            >
              <Text style={styles.debugTexto}>🌱 Semear semana (fecha concluído)</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={semearDesafioReducaoExpirado}
              style={styles.debugLink}
              hitSlop={8}
            >
              <Text style={styles.debugTexto}>🌱 Semear semana (fecha expirado)</Text>
            </Pressable>
          </>
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
  // Citação do porquê (RN14) — Zilla itálico, barra Musgo à esquerda,
  // mesmo princípio de destaque das citações no resto do app (principio 5
  // do CLAUDE.md: o porquê pessoal merece reaparecer).
  citacao: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  citacaoBarra: {
    width: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.musgo,
  },
  citacaoConteudo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  citacaoTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.heading,
    fontStyle: 'italic',
    color: theme.colors.textPrimary,
  },
  // Linhas de navegação com o estado atual em uma linha (RN15/RN16) — dá
  // pra saber se o bloqueio está ativo sem entrar na tela.
  linhaNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  linhaNavComToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  linhaNavToque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  linhaNavTextos: {
    flex: 1,
    gap: 2,
  },
  linhaNavTitulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  linhaNavSubtitulo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
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
    alignItems: 'center',
  },
  // Link neutro centralizado (RN18) — nem Cobre (destaque de CTA) nem cor
  // de erro/alerta. É uma ação real, mas não precisa competir visualmente
  // nem soar punitiva (princípio 3 do CLAUDE.md).
  textoExcluirConta: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.terraSuave,
    textDecorationLine: 'underline',
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
