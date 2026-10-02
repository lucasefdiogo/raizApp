import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Info } from 'lucide-react-native';
import { theme } from '../../theme';
import { useRegrasBloqueio } from '../../hooks/useRegrasBloqueio';
import { useAccessibilityPermission } from '../../hooks/useAccessibilityPermission';
import { janelaBloqueioValida, resumoRegrasBloqueio } from '../../domain/appBlock';
import { JanelaBloqueio } from '../../domain/types';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { AppListItem } from '../../components/bloqueio/AppListItem';
import { SeletorDiasSemana } from '../../components/bloqueio/SeletorDiasSemana';
import { logAcessibilidadeSaibaMais } from '../../services/analytics';

const JANELA_PADRAO: JanelaBloqueio = { inicio: '09:00', fim: '18:00', diasSemana: [] };

interface BloqueioAppsScreenProps {
  uid: string;
  /**
   * "Ativar" e "Saiba o que é" levam pra mesma rota
   * (DivulgacaoAcessibilidadeScreen) — ela decide sozinha o que mostrar a
   * partir do status real do serviço, não de qual dos dois foi tocado.
   */
  aoTocarAtivar: () => void;
  aoTocarSaibaOQueE: () => void;
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

/**
 * Tela de configuração do bloqueio de apps (Perfil → "Bloqueio de apps").
 * Edita a partir da regra PENDENTE quando existe uma (é o que vai valer a
 * partir de amanhã), senão da vigente, senão dos valores padrão — faz
 * sentido editar "o que está por vir", não o que já ficou pra trás. Toda
 * gravação (inclusive esvaziar a seleção de apps, o jeito de "desativar")
 * passa por useRegrasBloqueio.salvar, que decide sozinho se é imediata ou
 * pendente (regra única, sem distinguir tipo de mudança).
 */
export function BloqueioAppsScreen({
  uid,
  aoTocarAtivar,
  aoTocarSaibaOQueE,
}: BloqueioAppsScreenProps) {
  const {
    carregando,
    appsInstalados,
    regrasVigentes,
    regrasPendentes,
    salvar,
    cancelarAlteracaoPendente,
  } = useRegrasBloqueio(uid);
  const { ativo: servicoAtivo, carregando: statusCarregando } = useAccessibilityPermission();

  const handleAtivar = () => {
    logAcessibilidadeSaibaMais('ativar', servicoAtivo ? 'ativo' : 'desativado');
    aoTocarAtivar();
  };

  const handleSaibaOQueE = () => {
    logAcessibilidadeSaibaMais('link', servicoAtivo ? 'ativo' : 'desativado');
    aoTocarSaibaOQueE();
  };

  const [appsSelecionados, setAppsSelecionados] = useState<string[]>([]);
  const [janela, setJanela] = useState<JanelaBloqueio>(JANELA_PADRAO);
  const [busca, setBusca] = useState('');
  const [seletorAberto, setSeletorAberto] = useState<'inicio' | 'fim' | null>(null);
  const inicializadoRef = useRef(false);

  useEffect(() => {
    if (carregando || inicializadoRef.current) {
      return;
    }
    inicializadoRef.current = true;

    const base = regrasPendentes ?? regrasVigentes;
    setAppsSelecionados(base?.apps ?? []);
    setJanela(base?.janelas[0] ?? JANELA_PADRAO);
  }, [carregando, regrasPendentes, regrasVigentes]);

  const appsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) {
      return appsInstalados;
    }
    return appsInstalados.filter(app => app.nome.toLowerCase().includes(termo));
  }, [appsInstalados, busca]);

  const toggleApp = (packageName: string) => {
    setAppsSelecionados(atual =>
      atual.includes(packageName)
        ? atual.filter(pacote => pacote !== packageName)
        : [...atual, packageName],
    );
  };

  const toggleDia = (dia: number) => {
    setJanela(atual => ({
      ...atual,
      diasSemana: atual.diasSemana.includes(dia)
        ? atual.diasSemana.filter(d => d !== dia)
        : [...atual.diasSemana, dia].sort((a, b) => a - b),
    }));
  };

  // Sem apps selecionados, a janela não importa (nada seria bloqueado de
  // qualquer forma) — não exige horário/dias válidos nesse caso, pra não
  // travar o fluxo de "desativar o bloqueio" (esvaziar a seleção).
  const janelaValida =
    appsSelecionados.length === 0 ||
    (janelaBloqueioValida(janela.inicio, janela.fim) && janela.diasSemana.length > 0);

  const regrasEmEdicao = {
    apps: appsSelecionados,
    janelas: appsSelecionados.length > 0 ? [janela] : [],
  };
  const resumo = resumoRegrasBloqueio(regrasEmEdicao);

  const handleSalvar = () => {
    salvar(appsSelecionados, appsSelecionados.length > 0 ? janela : null);
  };

  const handleAlterarHorario =
    (campo: 'inicio' | 'fim') => (evento: DateTimePickerEvent, data?: Date) => {
      setSeletorAberto(null);
      if (evento.type === 'set' && data) {
        setJanela(atual => ({ ...atual, [campo]: dateParaHorario(data) }));
      }
    };

  if (carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        testID="lista-apps"
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        data={appsFiltrados}
        keyExtractor={app => app.packageName}
        ListHeaderComponent={
          <>
            <Text style={styles.titulo}>Bloqueio de apps</Text>

            <Text style={styles.secaoTitulo}>Serviço de acessibilidade</Text>
            <View style={styles.linhaStatus}>
              <Text
                style={[
                  styles.status,
                  servicoAtivo ? styles.statusAtivo : styles.statusInativo,
                ]}
              >
                {statusCarregando ? 'Verificando…' : servicoAtivo ? 'Ativo' : 'Desativado'}
              </Text>
            </View>
            {!statusCarregando && !servicoAtivo && (
              <Text style={styles.avisoDesativado}>
                Sem ele, o Rootora não consegue interceptar os apps abaixo.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={handleSaibaOQueE}
              hitSlop={8}
              style={styles.linkSaibaOQueE}
            >
              <Info size={14} color={theme.colors.textSecondary} />
              <Text style={styles.linkSaibaOQueETexto}>Saiba o que é</Text>
            </Pressable>
            {!statusCarregando && !servicoAtivo && (
              <SecondaryButton titulo="Ativar" onPress={handleAtivar} />
            )}

            {regrasPendentes && (
              <View style={styles.avisoPendente}>
                <Text style={styles.avisoPendenteTexto}>
                  Nova regra começa amanhã: {resumoRegrasBloqueio(regrasPendentes)}
                </Text>
                <SecondaryButton
                  titulo="Cancelar alteração"
                  onPress={cancelarAlteracaoPendente}
                />
              </View>
            )}

            <Text style={styles.secaoTitulo}>Horário</Text>
            <View style={styles.blocoJanela}>
              <View style={styles.linhaHorario}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSeletorAberto('inicio')}
                  style={styles.campoHorario}
                >
                  <Text style={styles.rotulo}>Início</Text>
                  <Text style={styles.valorHorario}>{janela.inicio}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSeletorAberto('fim')}
                  style={styles.campoHorario}
                >
                  <Text style={styles.rotulo}>Fim</Text>
                  <Text style={styles.valorHorario}>{janela.fim}</Text>
                </Pressable>
              </View>
              {seletorAberto && (
                <DateTimePicker
                  value={horarioParaDate(janela[seletorAberto])}
                  mode="time"
                  is24Hour
                  onChange={handleAlterarHorario(seletorAberto)}
                />
              )}

              <Text style={styles.rotuloDias}>Dias da semana</Text>
              <SeletorDiasSemana diasSelecionados={janela.diasSemana} onToggleDia={toggleDia} />
            </View>

            {!janelaValida && (
              <Text style={styles.erroValidacao}>
                Escolha um horário de fim depois do início e pelo menos um dia da semana.
              </Text>
            )}

            <Text style={styles.secaoTitulo}>Apps</Text>
            <TextField
              label="Buscar"
              value={busca}
              onChangeText={setBusca}
              placeholder="Nome do app"
            />
          </>
        }
        renderItem={({ item }) => (
          <AppListItem
            app={item}
            selecionado={appsSelecionados.includes(item.packageName)}
            onToggle={() => toggleApp(item.packageName)}
          />
        )}
        ListEmptyComponent={<Text style={styles.listaVazia}>Nenhum app encontrado.</Text>}
        ListFooterComponent={
          <>
            <Text style={styles.resumo}>{resumo}</Text>
            <PrimaryButton titulo="Salvar" onPress={handleSalvar} desabilitado={!janelaValida} />
          </>
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
  conteudo: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  secaoTitulo: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  linhaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  status: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  statusAtivo: {
    color: theme.colors.musgo,
  },
  statusInativo: {
    color: theme.colors.textSecondary,
  },
  avisoDesativado: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  // Área de toque >= 44px (hitSlop + minHeight) mesmo o conteúdo visual
  // sendo bem menor — ícone + texto sublinhado, sem fundo, nunca Cobre
  // (o "Salvar" no rodapé já é o único destaque Cobre da tela).
  linkSaibaOQueE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  linkSaibaOQueETexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  avisoPendente: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  avisoPendenteTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  listaVazia: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
  },
  // Agrupa horário + dias com um gap mais apertado que o ritmo entre seções
  // (theme.spacing.sm, não md) — as duas coisas formam uma única janela de
  // bloqueio, então precisam parecer mais coladas entre si do que em
  // relação ao resto da tela.
  blocoJanela: {
    gap: theme.spacing.sm,
  },
  linhaHorario: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  campoHorario: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  rotulo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
  rotuloDias: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  valorHorario: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  erroValidacao: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.erro,
  },
  resumo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
