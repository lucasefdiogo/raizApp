import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { EstadoTravado } from '../../domain/types';
import { DURACAO_SEG_SESSAO_BLOQUEIO, SnapshotDia } from '../../domain/intercept';
import { resolverConfigBloco, saldoDisponivel } from '../../domain/saldoBloqueio';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { useIntercept } from '../../hooks/useIntercept';
import { useBloqueioSaldo } from '../../hooks/useBloqueioSaldo';
import { VisaoBloqueio, abrirApp } from '../../native/AccessibilityDetection';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SessaoFocoScreen } from './SessaoFocoScreen';
import { SessaoAtivaAviso } from './SessaoAtivaAviso';
import { PausaIntencaoScreen } from './PausaIntencaoScreen';
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
  snapshot: SnapshotDia;
  /**
   * Estado do saldo de blocos que o nativo calculou ao abrir a tela (extra
   * `estadoBloqueioJson`, já parseado). Ausente = a tela lê do nativo assim
   * que montar.
   */
  visaoInicial?: VisaoBloqueio | null;
  /** Ausente/duracaoRestanteSeg <= 0 = segue a fase do saldo normalmente. */
  sessaoAtivaResumida?: SessaoAtivaResumida | null;
  /** "Sair"/"Agora não"/fim de qualquer sub-fluxo — real: BackHandler.exitApp; debug: volta pra tela de debug (ver InterceptRoot). */
  onSair: () => void;
}

type Modo = 'principal' | 'sessao' | 'extras' | 'emergencia';

/** Respiração guiada da saída de emergência (RN-06). */
const DURACAO_SEG_RESPIRACAO_EMERGENCIA = 60;

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
  snapshot,
  visaoInicial = null,
  sessaoAtivaResumida,
  onSair,
}: InterceptScreenProps) {
  const dailyTasks = useDailyTasks(uid);
  const saldo = useBloqueioSaldo(uid, visaoInicial);
  const fase = saldo.visao?.estado.fase ?? 'AGUARDANDO_LIBERACAO';
  const configBloco = resolverConfigBloco(saldo.visao?.config);
  const [sessaoLivre, setSessaoLivre] = useState(false);
  const { registrarAcao } = useIntercept(uid, packageName);
  const temSessaoResumida =
    !!sessaoAtivaResumida && sessaoAtivaResumida.duracaoRestanteSeg > 0;
  const [modo, setModo] = useState<Modo>(
    temSessaoResumida ? 'sessao' : 'principal',
  );

  const tarefasParaExibir = dailyTasks.carregando
    ? snapshot.tarefas
    : dailyTasks.tarefas;

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
    onSair();
  }

  async function handleLiberarBloco(intencao: string) {
    registrarAcao('B', 'liberou');
    const liberado = await saldo.liberar(intencao);
    if (liberado) {
      await abrirAppEFechar();
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
          duracaoSeg={DURACAO_SEG_RESPIRACAO_EMERGENCIA}
          onConcluir={handleEmergenciaConcluida}
        />
      </SafeAreaView>
    );
  }

  if (modo === 'extras') {
    const extrasPendentes = tarefasParaExibir.filter(
      tarefa => !tarefa.essencial && !tarefa.concluida && !tarefa.tarefaPaiId,
    );
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
        <PausaIntencaoScreen
          appLabel={appLabel}
          duracaoSeg={saldo.pausaIntencaoSeg}
          saldo={
            saldo.visao
              ? saldoDisponivel(saldo.visao.estado, configBloco)
              : null
          }
          onLiberar={handleLiberarBloco}
          onAgoraNao={handleAgoraNaoPausa}
        />
      </SafeAreaView>
    );
  }

  if (fase === 'COOLDOWN' || fase === 'SALDO_ZERADO') {
    return (
      <SafeAreaView style={styles.container} testID="intercept-screen">
        <EsperaBloqueioScreen
          variante={fase === 'COOLDOWN' ? 'cooldown' : 'zerado'}
          restanteMs={
            fase === 'COOLDOWN'
              ? Math.max(
                  0,
                  (saldo.visao?.estado.fimCooldownEm ?? 0) - saldo.agora,
                )
              : 0
          }
          blocoPorTarefaExtra={configBloco.blocoPorTarefaExtra}
          onSessaoFoco={handleSessaoDeFoco}
          onTarefasExtras={() => setModo('extras')}
          onSair={onSair}
          acessoRapidoDisponivel={saldo.acessoRapidoDisponivel}
          esperaSeg={saldo.esperaAcessoRapidoSeg}
          msAteProximo={saldo.msAteProximoAcessoRapido}
          emergenciaOferecida={saldo.emergenciaOferecida}
          onAcessoRapido={handleAcessoRapido}
          onEmergencia={() => setModo('emergencia')}
        />
      </SafeAreaView>
    );
  }

  // Sessão já em andamento (o Service não intercepta nesta fase, mas a tela
  // pode ter ficado aberta enquanto o estado virou): tempo restante e aviso.
  return (
    <SafeAreaView style={styles.container} testID="intercept-screen">
      <View style={styles.conteudo}>
        <SessaoAtivaAviso
          msRestantes={saldo.msRestantesSessao}
          avisoUmMinuto={saldo.avisoUmMinuto}
        />
        <PrimaryButton
          titulo={`Abrir o ${appLabel}`}
          onPress={abrirAppEFechar}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
});
