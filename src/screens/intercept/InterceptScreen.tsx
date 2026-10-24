import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { EstadoTravado } from '../../domain/types';
import { DURACAO_SEG_SESSAO_BLOQUEIO, SnapshotDia } from '../../domain/intercept';
import { resolverConfigBloco, saldoDisponivel } from '../../domain/saldoBloqueio';
import { ACESSOS_RAPIDOS_DIARIOS } from '../../domain/acessoRapido';
import { TipoValvula, montarValvulas } from '../../domain/valvulas';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { useIntercept } from '../../hooks/useIntercept';
import { useBloqueioSaldo } from '../../hooks/useBloqueioSaldo';
import { useToast } from '../../hooks/useToast';
import { VisaoBloqueio, abrirApp } from '../../native/AccessibilityDetection';
import { logAlternativaNoturnaEscolhida, logValvulaEscolhida } from '../../services/analytics';
import { SessaoFocoScreen } from './SessaoFocoScreen';
import { PausaIntencaoNoturna } from '../rotina/PausaIntencaoNoturna';
import { EsperaAcessoRapidoNoturna } from '../rotina/EsperaAcessoRapidoNoturna';
import { EsperaBloqueioScreen } from './EsperaBloqueioScreen';
import { RespiracaoEmergenciaScreen } from './RespiracaoEmergenciaScreen';
import { TarefasExtrasScreen } from './TarefasExtrasScreen';

/**
 * Sessão de foco já em andamento (Etapa 4 — "sessão ativa" em
 * SharedPreferences, ver useFocusSession) que o AccessibilityService
 * detectou ao reabrir o pacote — pula a pausa direto pra
 * SessaoFocoScreen, retomando com o tempo restante (não a duração original).
 */
export interface SessaoAtivaResumida {
  tarefaId: string | null;
  estadoTravado: EstadoTravado | null;
  duracaoRestanteSeg: number;
}

interface InterceptScreenProps {
  uid: string;
  packageName: string;
  appLabel: string;
  /** PNG base64 do app interceptado (RN01) — resolvido pelo InterceptRoot via listarAppsInstalados(). */
  appIconeBase64: string;
  snapshot: SnapshotDia;
  /**
   * Estado do saldo de blocos que o nativo calculou ao abrir a tela (extra
   * `estadoBloqueioJson`, já parseado). Ausente = a tela lê do nativo assim
   * que montar.
   */
  visaoInicial?: VisaoBloqueio | null;
  /** Ausente/duracaoRestanteSeg <= 0 = segue a fase do saldo normalmente. */
  sessaoAtivaResumida?: SessaoAtivaResumida | null;
  /**
   * "Voltar ao início"/"Agora não"/alternativa noturna/"Parar aqui" — saída
   * total pra tela inicial do Android (ver InterceptRoot), nunca pra revelar
   * o app bloqueado por baixo.
   */
  onSair: () => void;
  /**
   * Só depois de abrir o app liberado (ver `abrirAppEFechar`) — fecha a
   * interceptação sem forçar a Home, porque o que deve aparecer por baixo é
   * justamente o app que o usuário pediu para abrir.
   */
  onFecharAposAbrir: () => void;
}

type Modo = 'principal' | 'sessao' | 'extras' | 'emergencia' | 'acessoRapido';

/** Respiração guiada da saída de emergência (RN-06). */
const DURACAO_SEG_RESPIRACAO_EMERGENCIA = 60;

const MENSAGEM_FALHA_LIBERAR = 'Não conseguimos liberar agora. Tente de novo.';
const MENSAGEM_UM_MINUTO_RESTANTE = '1 minuto restante na sessão.';

interface ParametrosSessao {
  tarefaId: string | null;
  estadoTravado: EstadoTravado | null;
  duracaoInicialSeg: number;
}

/**
 * InterceptScreen — a fase vinda do nativo decide a tela: pausa de intenção
 * (AGUARDANDO_LIBERACAO, também o padrão enquanto o nativo não respondeu),
 * cooldown e saldo zerado (espera com sessão de foco e tarefas extras) ou
 * sessão já ativa. Nenhuma tarefa precisa estar cumprida para liberar.
 * `snapshot` (prop, veio do SharedPreferences via initialProps) cobre a lista
 * de tarefas extras até o useDailyTasks(uid) resolver.
 */
export function InterceptScreen({
  uid,
  packageName,
  appLabel,
  appIconeBase64,
  snapshot,
  visaoInicial = null,
  sessaoAtivaResumida,
  onSair,
  onFecharAposAbrir,
}: InterceptScreenProps) {
  const dailyTasks = useDailyTasks(uid);
  const saldo = useBloqueioSaldo(uid, visaoInicial);
  const fase = saldo.visao?.estado.fase ?? 'AGUARDANDO_LIBERACAO';
  const configBloco = resolverConfigBloco(saldo.visao?.config);
  const [sessaoLivre, setSessaoLivre] = useState(false);
  const { registrarAcao } = useIntercept(uid, packageName);
  const { showToast } = useToast();
  const temSessaoResumida =
    !!sessaoAtivaResumida && sessaoAtivaResumida.duracaoRestanteSeg > 0;
  const [modo, setModo] = useState<Modo>(
    temSessaoResumida ? 'sessao' : 'principal',
  );

  const tarefasParaExibir = dailyTasks.carregando
    ? snapshot.tarefas
    : dailyTasks.tarefas;

  const extrasPendentes = tarefasParaExibir.filter(
    tarefa => !tarefa.essencial && !tarefa.concluida && !tarefa.tarefaPaiId,
  );

  const valvulas = montarValvulas({
    acessoRapidoDisponivel: saldo.acessoRapidoDisponivel,
    usosAcessoRapidoHoje: ACESSOS_RAPIDOS_DIARIOS - saldo.acessosRapidosRestantes,
    msAteProximoAcessoRapido:
      saldo.acessosRapidosRestantes > 0 ? saldo.msAteProximoAcessoRapido : null,
    emergenciaOferecida: saldo.emergenciaOferecida,
    esperaAcessoRapidoSeg: saldo.esperaAcessoRapidoSeg,
    tarefasExtrasPendentes: extrasPendentes.length,
  });

  const parametrosSessao: ParametrosSessao | null = sessaoLivre
    ? {
        tarefaId: null,
        estadoTravado: null,
        duracaoInicialSeg: DURACAO_SEG_SESSAO_BLOQUEIO,
      }
    : temSessaoResumida
    ? {
        tarefaId: sessaoAtivaResumida!.tarefaId,
        estadoTravado: sessaoAtivaResumida!.estadoTravado,
        duracaoInicialSeg: sessaoAtivaResumida!.duracaoRestanteSeg,
      }
    : null;

  async function abrirAppEFechar() {
    await abrirApp(packageName);
    onFecharAposAbrir();
  }

  // Sessão já em andamento (RN08, HU-11): o Service não intercepta nesta
  // fase, mas a tela pode ter ficado aberta enquanto o estado virou — abre o
  // app direto, sem exigir toque, com um aviso passageiro (Toast) se faltar
  // só 1 minuto. Nunca uma tela cheia bloqueante.
  useEffect(() => {
    if (fase !== 'SESSAO_ATIVA' || modo !== 'principal') {
      return;
    }
    if (saldo.avisoUmMinuto) {
      showToast(MENSAGEM_UM_MINUTO_RESTANTE);
    }
    abrirAppEFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a transição pra SESSAO_ATIVA importa; abrirAppEFechar/showToast são recriados a cada render sem precisar reexecutar o efeito.
  }, [fase, modo, saldo.avisoUmMinuto]);

  async function handleLiberarBloco(intencao: string) {
    registrarAcao('B', 'liberou');
    const liberado = await saldo.liberar(intencao);
    if (liberado) {
      await abrirAppEFechar();
    } else {
      showToast(MENSAGEM_FALHA_LIBERAR);
    }
  }

  async function handleAcessoRapido() {
    if (await saldo.liberarAcessoRapido()) {
      await abrirAppEFechar();
    }
  }

  async function handleEmergenciaConcluida() {
    if (await saldo.concluirEmergencia()) {
      await abrirAppEFechar();
    } else {
      setModo('principal');
    }
  }

  function handleAgoraNaoPausa() {
    registrarAcao('B', 'saiu');
    onSair();
  }

  /** Alternativa noturna (RN08): fecha sem liberar, sem avançar a posição da sessão. */
  function handleAlternativaNoturna() {
    logAlternativaNoturnaEscolhida();
    registrarAcao('B', 'saiu');
    onSair();
  }

  /** "OUTRAS SAÍDAS" (RN02/RN11): cada válvula leva a um sub-fluxo próprio. */
  function handleValvula(tipo: TipoValvula) {
    logValvulaEscolhida(tipo, saldo.dentroJanelaNoturna);
    switch (tipo) {
      case 'acesso_rapido':
        setModo('acessoRapido');
        break;
      case 'emergencia':
        setModo('emergencia');
        break;
      case 'sessao_foco':
        handleSessaoDeFoco();
        break;
      case 'tarefas_extras':
        setModo('extras');
        break;
    }
  }

  /** Fim da sessão de foco: o "Liberar" leva à pausa de intenção do próximo bloco, não libera direto. */
  function handleLiberarNaSessao() {
    setSessaoLivre(false);
    setModo('principal');
  }

  function handleSessaoDeFoco() {
    setSessaoLivre(true);
    setModo('sessao');
  }

  function handleFecharSessao() {
    setSessaoLivre(false);
    onSair();
  }

  function handleTarefaConcluida(tarefaId: string | null) {
    if (!tarefaId) {
      return;
    }
    const tarefa = tarefasParaExibir.find(item => item.id === tarefaId);
    if (tarefa && !tarefa.concluida) {
      dailyTasks.alternarTarefa(tarefaId);
    }
  }

  if (modo === 'sessao' && parametrosSessao) {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <SessaoFocoScreen
          uid={uid}
          duracaoInicialSeg={parametrosSessao.duracaoInicialSeg}
          tarefaId={parametrosSessao.tarefaId}
          origem="interceptacao"
          estadoTravado={parametrosSessao.estadoTravado}
          onMarcarTarefaComoFeita={() =>
            handleTarefaConcluida(parametrosSessao.tarefaId)
          }
          onFechar={handleFecharSessao}
          appLabel={appLabel}
          packageName={packageName}
          onLiberarApp={
            fase === 'AGUARDANDO_LIBERACAO' ? handleLiberarNaSessao : undefined
          }
        />
      </SafeAreaView>
    );
  }

  if (modo === 'emergencia') {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <RespiracaoEmergenciaScreen
          appIconeBase64={appIconeBase64}
          appLabel={appLabel}
          duracaoSeg={DURACAO_SEG_RESPIRACAO_EMERGENCIA}
          onConcluir={handleEmergenciaConcluida}
          onCancelar={() => setModo('principal')}
        />
      </SafeAreaView>
    );
  }

  if (modo === 'acessoRapido') {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <EsperaAcessoRapidoNoturna
          uid={uid}
          appIconeBase64={appIconeBase64}
          appLabel={appLabel}
          blocosUsados={saldo.visao?.estado.blocosUsados ?? 0}
          esperaSeg={saldo.esperaAcessoRapidoSeg}
          onLiberado={handleAcessoRapido}
          onVoltarAoInicio={onSair}
          onAlternativa={handleAlternativaNoturna}
        />
      </SafeAreaView>
    );
  }

  if (modo === 'extras') {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <TarefasExtrasScreen
          tarefas={extrasPendentes}
          blocoPorTarefaExtra={configBloco.blocoPorTarefaExtra}
          onConcluir={dailyTasks.alternarTarefa}
          onAdicionar={titulo => dailyTasks.adicionarTarefa(titulo, false)}
          onVoltar={() => setModo('principal')}
        />
      </SafeAreaView>
    );
  }

  if (fase === 'AGUARDANDO_LIBERACAO') {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <PausaIntencaoNoturna
          uid={uid}
          appIconeBase64={appIconeBase64}
          appLabel={appLabel}
          blocosUsados={saldo.visao?.estado.blocosUsados ?? 0}
          duracaoBlocoMin={configBloco.duracaoBlocoMin}
          duracaoPadraoSeg={saldo.pausaIntencaoSeg}
          saldo={
            saldo.visao
              ? saldoDisponivel(saldo.visao.estado, configBloco)
              : null
          }
          onLiberar={handleLiberarBloco}
          onAgoraNao={handleAgoraNaoPausa}
          onAlternativaNoturna={handleAlternativaNoturna}
        />
      </SafeAreaView>
    );
  }

  if (fase === 'COOLDOWN' || fase === 'SALDO_ZERADO') {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <EsperaBloqueioScreen
          appIconeBase64={appIconeBase64}
          appLabel={appLabel}
          variante={fase === 'COOLDOWN' ? 'cooldown' : 'zerado'}
          restanteMs={
            fase === 'COOLDOWN'
              ? Math.max(
                  0,
                  (saldo.visao?.estado.fimCooldownEm ?? 0) - saldo.agora,
                )
              : 0
          }
          cooldownTotalMs={configBloco.cooldownMin * 60_000}
          duracaoBlocoMin={configBloco.duracaoBlocoMin}
          valvulas={valvulas}
          onValvula={handleValvula}
          onVoltarAoInicio={onSair}
        />
      </SafeAreaView>
    );
  }

  // fase === 'SESSAO_ATIVA': o useEffect acima já abre o app sozinho, sem
  // UI própria — nunca uma tela cheia bloqueante (RN08).
  return <SafeAreaView style={styles.container} testID="intercept-screen" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
