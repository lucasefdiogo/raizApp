import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useAppBlockConfig } from '../../hooks/useAppBlockConfig';
import { useAccessibilityPermission } from '../../hooks/useAccessibilityPermission';
import { AppSelectorItem } from '../../components/appblock/AppSelectorItem';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { EmptyState } from '../../components/common/EmptyState';
import { BackButton } from '../../components/common/BackButton';

const DURACAO_FEEDBACK_SALVO_MS = 2000;
const HORARIO_INICIO_PADRAO = '09:00';
const HORARIO_FIM_PADRAO = '18:00';

interface AppBlockConfigScreenProps {
  uid: string;
  aoVoltar: () => void;
}

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

export function AppBlockConfigScreen({
  uid,
  aoVoltar,
}: AppBlockConfigScreenProps) {
  const {
    appsInstalados,
    configAtual,
    carregando,
    alternarApp,
    salvarHorario,
    alternarAtivo,
    recarregar,
  } = useAppBlockConfig(uid);
  const {
    ativo: acessibilidadeAtiva,
    carregando: acessibilidadeCarregando,
    verificarNovamente: reverificarAcessibilidade,
    abrirConfiguracoes: abrirConfiguracoesAcessibilidade,
  } = useAccessibilityPermission();

  const [rascunhoInicio, setRascunhoInicio] = useState(HORARIO_INICIO_PADRAO);
  const [rascunhoFim, setRascunhoFim] = useState(HORARIO_FIM_PADRAO);
  const [seletorAberto, setSeletorAberto] = useState<'inicio' | 'fim' | null>(
    null,
  );
  const [salvoVisivel, setSalvoVisivel] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await Promise.all([recarregar(), reverificarAcessibilidade()]);
    } finally {
      setAtualizando(false);
    }
  }, [recarregar, reverificarAcessibilidade]);

  useEffect(() => {
    if (configAtual.horarioInicio) {
      setRascunhoInicio(configAtual.horarioInicio);
    }
    if (configAtual.horarioFim) {
      setRascunhoFim(configAtual.horarioFim);
    }
  }, [configAtual.horarioInicio, configAtual.horarioFim]);

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

  const handleEscolherHorario = (
    evento: DateTimePickerEvent,
    data?: Date,
  ) => {
    setSeletorAberto(null);
    if (evento.type !== 'set' || !data) {
      return;
    }
    const horario = dateParaHorario(data);
    if (seletorAberto === 'inicio') {
      setRascunhoInicio(horario);
    } else {
      setRascunhoFim(horario);
    }
  };

  const handleSalvarHorario = async () => {
    await salvarHorario(rascunhoInicio, rascunhoFim);
    setSalvoVisivel(true);
  };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        testID="app-block-lista"
        style={styles.lista}
        contentContainerStyle={styles.conteudoLista}
        data={appsInstalados}
        keyExtractor={item => item.packageName}
        refreshControl={
          <RefreshControl
            testID="app-block-refresh-control"
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={[theme.colors.musgo]}
            tintColor={theme.colors.musgo}
          />
        }
        renderItem={({ item }) => (
          <AppSelectorItem
            nome={item.nome}
            icone={item.icone}
            selecionado={configAtual.appsSelecionados.includes(
              item.packageName,
            )}
            onToggle={() => alternarApp(item.packageName)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            titulo="Nenhum app encontrado"
            corpo="Não encontramos apps instalados no aparelho pra listar aqui."
          />
        }
        ListHeaderComponent={
          // O `gap` do contentContainerStyle só separa os filhos diretos do
          // FlatList (cabeçalho, cada linha, rodapé) — o RN embrulha o
          // ListHeaderComponent num View próprio sem gap, então precisa de
          // um gap dele mesmo pra ficar igual ao espaçamento das telas com
          // ScrollView (Hoje, Perfil, Progresso).
          <View style={styles.cabecalho}>
            <BackButton onPress={aoVoltar} />
            <Text style={styles.titulo}>Bloqueio de apps</Text>

            {!acessibilidadeCarregando && !acessibilidadeAtiva && (
              <View
                testID="app-block-aviso-acessibilidade"
                style={styles.avisoPermissao}
              >
                <Text style={styles.avisoPermissaoTitulo}>
                  Falta uma permissão pro bloqueio funcionar
                </Text>
                <Text style={styles.avisoPermissaoCorpo}>
                  O Rootora precisa do Serviço de Acessibilidade ativado pra
                  saber quando um app bloqueado é aberto. Ele não lê o
                  conteúdo da tela — só o nome do app em uso.
                </Text>
                <PrimaryButton
                  titulo="Ativar nas Configurações"
                  onPress={abrirConfiguracoesAcessibilidade}
                />
              </View>
            )}

            <Pressable
              testID="app-block-ativo-toggle"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: configAtual.ativo }}
              onPress={() => alternarAtivo(!configAtual.ativo)}
              style={styles.linhaAtivo}
            >
              <Text style={styles.rotulo}>Ativar bloqueio de apps</Text>
              <View
                style={[
                  styles.checkboxAtivo,
                  configAtual.ativo && styles.checkboxAtivoMarcado,
                ]}
              />
            </Pressable>

            <Text style={styles.secaoTitulo}>Horário</Text>
            <Text style={styles.explicacao}>
              Aplicado a todos os apps selecionados abaixo.
            </Text>
            <View style={styles.linhaHorario}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSeletorAberto('inicio')}
                style={styles.botaoHorario}
              >
                <Text style={styles.rotuloHorario}>Início</Text>
                <Text style={styles.valorHorario}>{rascunhoInicio}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSeletorAberto('fim')}
                style={styles.botaoHorario}
              >
                <Text style={styles.rotuloHorario}>Fim</Text>
                <Text style={styles.valorHorario}>{rascunhoFim}</Text>
              </Pressable>
            </View>
            {seletorAberto && (
              <DateTimePicker
                value={horarioParaDate(
                  seletorAberto === 'inicio' ? rascunhoInicio : rascunhoFim,
                )}
                mode="time"
                is24Hour
                onChange={handleEscolherHorario}
              />
            )}
            <PrimaryButton titulo="Salvar horário" onPress={handleSalvarHorario} />
            {salvoVisivel && <Text style={styles.feedbackSalvo}>Salvo</Text>}

            <Text style={styles.secaoTitulo}>Apps</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  lista: {
    flex: 1,
  },
  conteudoLista: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cabecalho: {
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  avisoPermissao: {
    backgroundColor: theme.colors.areia,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  avisoPermissaoTitulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  avisoPermissaoCorpo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  linhaAtivo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  rotulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  checkboxAtivo: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  checkboxAtivoMarcado: {
    backgroundColor: theme.colors.musgo,
  },
  secaoTitulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  explicacao: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  linhaHorario: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  botaoHorario: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  rotuloHorario: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  valorHorario: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  feedbackSalvo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgo,
  },
});
