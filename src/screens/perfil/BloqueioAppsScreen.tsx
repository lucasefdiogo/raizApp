import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Info, Moon } from 'lucide-react-native';
import { theme } from '../../theme';
import { useRegrasBloqueio } from '../../hooks/useRegrasBloqueio';
import { useAccessibilityPermission } from '../../hooks/useAccessibilityPermission';
import { useAcessoUso } from '../../hooks/useAcessoUso';
import { useRotina } from '../../hooks/useRotina';
import { useToast } from '../../hooks/useToast';
import { useVoltarFisico } from '../../hooks/useVoltarFisico';
import {
  decidirGravacaoRegrasBloqueio,
  ehJanelaDiaTodo,
  HORARIOS_DIA_TODO,
  janelaBloqueioValida,
  mesmasRegrasBloqueio,
  resumoCurtoBloqueio,
  resumoRegrasBloqueio,
} from '../../domain/appBlock';
import { ACESSOS_RAPIDOS_DIARIOS } from '../../domain/acessoRapido';
import { hojeISOLocal } from '../../domain/data';
import { PACOTE_YOUTUBE, appsIniciaisSelecionados } from '../../domain/redesSociais';
import { horarioPausaMaior, resumoRotina } from '../../domain/rotina';
import { CONFIG_BLOCO_PADRAO, extrairConfigBloco } from '../../domain/saldoBloqueio';
import { JanelaBloqueio, RegrasBloqueio } from '../../domain/types';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { BackButton } from '../../components/common/BackButton';
import { Selo } from '../../components/common/Selo';
import { AppListItem } from '../../components/bloqueio/AppListItem';
import { SeletorDiasSemana } from '../../components/bloqueio/SeletorDiasSemana';
import { SecaoConfig } from '../../components/bloqueio/SecaoConfig';
import { SessoesInfoSheet } from '../../components/bloqueio/SessoesInfoSheet';
import { AvisoAlteracaoPendenteScreen } from './AvisoAlteracaoPendenteScreen';
import { logAcessibilidadeSaibaMais } from '../../services/analytics';

const SEM_BLOQUEIO: RegrasBloqueio = { apps: [], janelas: [] };

const DICA_YOUTUBE = 'Usa para estudar? Pode deixar livre.';

const JANELA_PADRAO: JanelaBloqueio = { inicio: '09:00', fim: '18:00', diasSemana: [] };

// HU-12: sem regrasBloqueio ainda, "O dia todo" vem pré-selecionado (RN02) —
// quem já tem regra configurada (vigente ou pendente) mantém o que tinha.
const JANELA_DIA_TODO_PADRAO: JanelaBloqueio = { ...HORARIOS_DIA_TODO, diasSemana: [] };

const DESCRICAO_DIA_TODO =
  'Sem horário fixo: a interceptação vale o dia inteiro, nos dias marcados abaixo.';

const MENSAGEM_ALTERACOES_NAO_SALVAS = 'Suas alterações não foram salvas.';

interface BloqueioAppsScreenProps {
  uid: string;
  /**
   * "Ativar" e "Saiba o que é" levam pra mesma rota
   * (DivulgacaoAcessibilidadeScreen) — ela decide sozinha o que mostrar a
   * partir do status real do serviço, não de qual dos dois foi tocado.
   */
  aoTocarAtivar: () => void;
  aoTocarSaibaOQueE: () => void;
  /** Abre a divulgação do acesso de uso (HU-02); só aparece com o acesso desligado. */
  aoTocarMedirTempo: () => void;
  /** Abre a RotinaPerfilScreen (HU-10) a partir do link "Editar" da seção Rotina noturna. */
  aoAbrirRotina?: () => void;
  onVoltar: () => void;
}

function regrasDoFormulario(apps: string[], janela: JanelaBloqueio): RegrasBloqueio {
  return { apps, janelas: apps.length > 0 ? [janela] : [] };
}

// HU-12 RN02: sem regra salva (vigente ou pendente) ainda, o ponto de
// partida do formulário é "o dia todo"; com regra salva mas sem janela
// (ex: bloqueio desativado), mantém o padrão de horário específico de
// sempre — sem regra salva não conta como "já tinha, continua com o que
// tinha" (RN02 só vale pra quem já configurou).
function janelaInicialDoFormulario(base: RegrasBloqueio | null | undefined): JanelaBloqueio {
  return base?.janelas[0] ?? (base ? JANELA_PADRAO : JANELA_DIA_TODO_PADRAO);
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
  aoTocarMedirTempo,
  aoAbrirRotina,
  onVoltar,
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
  const { concedido: acessoUsoConcedido, carregando: acessoUsoCarregando } = useAcessoUso();
  const { rotina, diasComDados } = useRotina(uid);
  const { showToast } = useToast();
  const [sheetSessoesAberta, setSheetSessoesAberta] = useState(false);

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
  const [mostrarAvisoPendente, setMostrarAvisoPendente] = useState(false);
  const inicializadoRef = useRef(false);

  useEffect(() => {
    if (carregando || inicializadoRef.current) {
      return;
    }
    inicializadoRef.current = true;

    const base = regrasPendentes ?? regrasVigentes;
    setAppsSelecionados(appsIniciaisSelecionados(base, appsInstalados));
    setJanela(janelaInicialDoFormulario(base));
  }, [carregando, regrasPendentes, regrasVigentes, appsInstalados]);

  // Nenhuma rede social da lista curada instalada: sem seleção de apps (RN-05).
  const semRedesSociais = appsInstalados.length === 0;

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

  // Sem state próprio — a opção do seletor é a própria janela (RN03): evita
  // as duas coisas dessincronizarem.
  const modoDiaTodo = ehJanelaDiaTodo(janela);

  const selecionarDiaTodo = () => {
    setJanela(atual => ({ ...HORARIOS_DIA_TODO, diasSemana: atual.diasSemana }));
  };

  const selecionarHorarioEspecifico = () => {
    setJanela(atual => ({ inicio: JANELA_PADRAO.inicio, fim: JANELA_PADRAO.fim, diasSemana: atual.diasSemana }));
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

  const regrasEmEdicao = regrasDoFormulario(appsSelecionados, janela);
  const resumo = resumoRegrasBloqueio(regrasEmEdicao);

  // Config de blocos (RN05): só leitura nesta tela, com os padrões de
  // saldoBloqueio.ts quando a regra vigente não define nada.
  const cfgBloco = { ...CONFIG_BLOCO_PADRAO, ...extrairConfigBloco(regrasVigentes) };

  // Mesmo ponto de partida do formulário (ver useEffect de inicialização) —
  // a pré-marcação da primeira configuração não conta como alteração. Depois
  // de salvar, o hook atualiza vigente/pendente e a edição volta a bater.
  const regrasSalvas = regrasPendentes ?? regrasVigentes;
  const regrasIniciais = regrasDoFormulario(
    appsIniciaisSelecionados(regrasSalvas, appsInstalados),
    janelaInicialDoFormulario(regrasSalvas),
  );
  const alteracaoNaoSalva = !carregando && !mesmasRegrasBloqueio(regrasIniciais, regrasEmEdicao);

  // Sair sem salvar não pede confirmação — só avisa, sem bloquear a saída.
  // No aviso de alteração pendente, voltar é o mesmo que "Voltar e revisar".
  const handleVoltar = () => {
    if (mostrarAvisoPendente) {
      setMostrarAvisoPendente(false);
      return;
    }
    if (alteracaoNaoSalva) {
      showToast(MENSAGEM_ALTERACOES_NAO_SALVAS);
    }
    onVoltar();
  };

  useVoltarFisico(handleVoltar);

  // Sempre que já existe regrasVigentes, QUALQUER salvar vira pendente
  // (regra única — ver decidirGravacaoRegrasBloqueio). Esse é exatamente o
  // momento de maior risco de renegociação por impulso (ex: desmarcar um
  // app no calor da vontade), então interrompe com
  // AvisoAlteracaoPendenteScreen antes de gravar qualquer coisa — a
  // primeira configuração (regrasVigentes ainda ausente) não passa por
  // esse aviso, não há nada "sendo afrouxado" ainda.
  const handleSalvar = () => {
    const decisao = decidirGravacaoRegrasBloqueio(regrasVigentes, regrasEmEdicao, hojeISOLocal());
    if (decisao.tipo === 'imediata') {
      salvar(appsSelecionados, appsSelecionados.length > 0 ? janela : null);
    } else {
      setMostrarAvisoPendente(true);
    }
  };

  const handleConfirmarPendente = async () => {
    await salvar(appsSelecionados, appsSelecionados.length > 0 ? janela : null);
    setMostrarAvisoPendente(false);
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

  if (mostrarAvisoPendente) {
    return (
      <AvisoAlteracaoPendenteScreen
        resumoVigente={resumoCurtoBloqueio(regrasVigentes ?? SEM_BLOQUEIO)}
        resumoNovo={resumoCurtoBloqueio(regrasEmEdicao)}
        onConfirmar={handleConfirmarPendente}
        onRevisar={() => setMostrarAvisoPendente(false)}
      />
    );
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
            <BackButton onPress={handleVoltar} />
            <Text style={styles.titulo}>Bloqueio de apps</Text>

            {regrasPendentes && (
              <View style={styles.bannerPendente}>
                <Text style={styles.bannerEyebrow}>VALE A PARTIR DE AMANHÃ</Text>
                <Text style={styles.bannerResumo}>{resumoCurtoBloqueio(regrasPendentes)}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={cancelarAlteracaoPendente}
                  hitSlop={8}
                  style={styles.bannerLink}
                >
                  <Text style={styles.linkSaibaOQueETexto}>Cancelar alteração</Text>
                </Pressable>
              </View>
            )}

            <SecaoConfig eyebrow="STATUS DO SERVIÇO">
              <View style={styles.blocoStatus}>
                {statusCarregando ? (
                  <Text style={styles.status}>Verificando…</Text>
                ) : (
                  <Selo texto={servicoAtivo ? 'ATIVO' : 'DESATIVADO'} ativo={servicoAtivo} />
                )}
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
              </View>
            </SecaoConfig>

            {!semRedesSociais && (
              <>
                <SecaoConfig eyebrow="QUANDO">
                  <View style={styles.blocoJanela}>
                    <View style={styles.linhaSeletorJanela}>
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: modoDiaTodo }}
                        accessibilityLabel="O dia todo"
                        onPress={selecionarDiaTodo}
                        style={[styles.opcaoJanela, modoDiaTodo && styles.opcaoJanelaSelecionada]}
                      >
                        <Text
                          style={[
                            styles.opcaoJanelaTexto,
                            modoDiaTodo && styles.opcaoJanelaTextoSelecionado,
                          ]}
                        >
                          O dia todo
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: !modoDiaTodo }}
                        accessibilityLabel="Horário específico"
                        onPress={selecionarHorarioEspecifico}
                        style={[styles.opcaoJanela, !modoDiaTodo && styles.opcaoJanelaSelecionada]}
                      >
                        <Text
                          style={[
                            styles.opcaoJanelaTexto,
                            !modoDiaTodo && styles.opcaoJanelaTextoSelecionado,
                          ]}
                        >
                          Horário específico
                        </Text>
                      </Pressable>
                    </View>

                    {modoDiaTodo ? (
                      <Text style={styles.descricaoJanela}>{DESCRICAO_DIA_TODO}</Text>
                    ) : (
                      <>
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
                      </>
                    )}

                    <Text style={styles.rotuloDias}>Dias da semana</Text>
                    <SeletorDiasSemana
                      diasSelecionados={janela.diasSemana}
                      onToggleDia={toggleDia}
                    />
                  </View>

                  {!janelaValida && (
                    <Text style={styles.erroValidacao}>
                      Escolha um horário de fim depois do início e pelo menos um dia da semana.
                    </Text>
                  )}
                </SecaoConfig>

                <SecaoConfig eyebrow="APPS">
                  <TextField
                    label="Buscar"
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Nome do app"
                  />
                </SecaoConfig>
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <AppListItem
            app={item}
            selecionado={appsSelecionados.includes(item.packageName)}
            onToggle={() => toggleApp(item.packageName)}
            dica={item.packageName === PACOTE_YOUTUBE ? DICA_YOUTUBE : undefined}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            {semRedesSociais
              ? 'Nenhuma rede social encontrada neste aparelho.'
              : 'Nenhum app encontrado.'}
          </Text>
        }
        ListFooterComponent={
          <>
            {!semRedesSociais && (
              <>
                <SecaoConfig
                  eyebrow="SESSÕES"
                  link={{ rotulo: 'Como funciona', onPress: () => setSheetSessoesAberta(true) }}
                >
                  <View style={styles.sessoesNumeros}>
                    <View style={styles.sessaoItem}>
                      <Text style={styles.sessaoNumero}>{cfgBloco.duracaoBlocoMin} min</Text>
                      <Text style={styles.sessaoLegenda}>de uso</Text>
                    </View>
                    <View style={styles.sessaoItem}>
                      <Text style={styles.sessaoNumero}>{cfgBloco.cooldownMin} min</Text>
                      <Text style={styles.sessaoLegenda}>de pausa</Text>
                    </View>
                    <View style={styles.sessaoItem}>
                      <Text style={styles.sessaoNumero}>{ACESSOS_RAPIDOS_DIARIOS}x</Text>
                      <Text style={styles.sessaoLegenda}>acesso rápido</Text>
                    </View>
                  </View>
                  {typeof cfgBloco.blocosDiarios === 'number' && (
                    <Text style={styles.notaSessoes}>
                      Até {cfgBloco.blocosDiarios} sessões por dia.
                    </Text>
                  )}
                </SecaoConfig>

                <SecaoConfig
                  eyebrow="ROTINA NOTURNA"
                  link={aoAbrirRotina ? { rotulo: 'Editar', onPress: aoAbrirRotina } : undefined}
                >
                  <View style={styles.linhaRotina}>
                    <Moon size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.textoRotina}>
                      {resumoRotina(rotina, diasComDados, acessoUsoConcedido, 'longa')}
                    </Text>
                  </View>
                  {rotina?.confirmadoEm && (
                    <Text style={styles.notaSessoes}>
                      Pausa maior entre {horarioPausaMaior(rotina.dormirEstimado)} e{' '}
                      {rotina.acordarEstimado}
                    </Text>
                  )}
                </SecaoConfig>
              </>
            )}

            {!acessoUsoCarregando && !acessoUsoConcedido && (
              <Pressable
                accessibilityRole="button"
                onPress={aoTocarMedirTempo}
                hitSlop={8}
                style={styles.linkMedirTempo}
              >
                <Text style={styles.linkSaibaOQueETexto}>Medir tempo nas redes</Text>
              </Pressable>
            )}

            {!semRedesSociais && (
              <>
                <Text style={styles.resumo}>{resumo}</Text>
                <PrimaryButton
                  titulo="Salvar"
                  onPress={handleSalvar}
                  desabilitado={!janelaValida}
                />
              </>
            )}
          </>
        }
      />

      <SessoesInfoSheet
        visible={sheetSessoesAberta}
        duracaoBlocoMin={cfgBloco.duracaoBlocoMin}
        cooldownMin={cfgBloco.cooldownMin}
        acessosRapidosDiarios={ACESSOS_RAPIDOS_DIARIOS}
        onEntendi={() => setSheetSessoesAberta(false)}
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
  // Só borda Terra Suave, sem fundo (RN08) — não pode competir com o status.
  bannerPendente: {
    borderWidth: 1,
    borderColor: theme.colors.terraSuave,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  bannerEyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  bannerResumo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  bannerLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  // Agrupa status + aviso + link + botão "Ativar" com gap mais apertado
  // que o ritmo entre seções (sm, não md/lg) — mesmo racional de
  // blocoJanela: formam um cluster só ("o que fazer com o serviço"),
  // precisam parecer mais colados entre si do que em relação ao que vem
  // depois (o aviso de pendência, que tem seu próprio respiro acima).
  blocoStatus: {
    gap: theme.spacing.sm,
  },
  status: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
  avisoDesativado: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
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
  linkMedirTempo: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
  },
  linkSaibaOQueETexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
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
  linhaSeletorJanela: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  opcaoJanela: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.terraSuave,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
  },
  // Terra Escura, não Cobre (RN08) — mesmo racional do dia selecionado em
  // SeletorDiasSemana; o único Cobre da tela é o "Salvar".
  opcaoJanelaSelecionada: {
    backgroundColor: theme.colors.terraEscura,
    borderColor: theme.colors.terraEscura,
  },
  opcaoJanelaTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  opcaoJanelaTextoSelecionado: {
    color: theme.colors.casca,
  },
  descricaoJanela: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
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
  sessoesNumeros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessaoItem: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sessaoNumero: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  sessaoLegenda: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  notaSessoes: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  linhaRotina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  textoRotina: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
});
