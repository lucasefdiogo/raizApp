import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { EstadoTela, EstadoTravado } from '../../domain/types';
import {
  DURACAO_SEG_FAZER_2_MINUTOS,
  SnapshotDia,
  selecionarTarefaIntercept,
} from '../../domain/intercept';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { useIntercept } from '../../hooks/useIntercept';
import { logInterceptShown } from '../../services/analytics';
import {
  abrirApp,
  registrarDesbloqueioTemporario,
} from '../../native/AccessibilityDetection';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { SessaoFocoScreen } from './SessaoFocoScreen';
import { TravadoFlowScreen } from './TravadoFlowScreen';

const MINUTOS_LIBERACAO_ESTADO_B = 15;

/**
 * Sessão de foco já em andamento (Etapa 4 — "sessão ativa" em
 * SharedPreferences, ver useFocusSession) que o AccessibilityService
 * detectou ao reabrir o pacote — pula a decisão A/B/C direto pra
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
  /** Ausente/duracaoRestanteSeg <= 0 = mostra a decisão A/B/C normalmente. */
  sessaoAtivaResumida?: SessaoAtivaResumida | null;
  /** "Sair"/"Agora não"/fim de qualquer sub-fluxo — real: BackHandler.exitApp; debug: volta pra tela de debug (ver InterceptRoot). */
  onSair: () => void;
}

type Modo = 'decisao' | 'sessao' | 'travado';

interface ParametrosSessao {
  tarefaId: string | null;
  estadoTravado: EstadoTravado | null;
  duracaoInicialSeg: number;
}

/**
 * InterceptScreen — estados A/B/C (seção 3 da spec 09-ponte-fuga-tarefa).
 * `snapshot` (prop, veio do SharedPreferences via initialProps — Etapa 4)
 * decide o estado exibido INSTANTANEAMENTE, sem esperar o Firestore — a
 * meta é aparecer em <300ms. useDailyTasks(uid) roda em paralelo e assume
 * assim que resolve (tarefasParaExibir troca sozinho), pra toda ação que
 * de fato grava (criar tarefa do estado C, "Estou travado", etc.) usar
 * dado ao vivo, não o snapshot potencialmente desatualizado.
 */
export function InterceptScreen({
  uid,
  packageName,
  appLabel,
  snapshot,
  sessaoAtivaResumida,
  onSair,
}: InterceptScreenProps) {
  const dailyTasks = useDailyTasks(uid);
  const { registrarAcao } = useIntercept(uid, packageName);
  const temSessaoResumida =
    !!sessaoAtivaResumida && sessaoAtivaResumida.duracaoRestanteSeg > 0;
  const [modo, setModo] = useState<Modo>(
    temSessaoResumida ? 'sessao' : 'decisao',
  );
  const [rascunhoTarefaC, setRascunhoTarefaC] = useState('');

  const tarefasParaExibir = dailyTasks.carregando
    ? snapshot.tarefas
    : dailyTasks.tarefas;
  const resultado = selecionarTarefaIntercept(
    { tarefas: tarefasParaExibir },
    new Date(),
  );

  const ultimoEstadoLogado = useRef<EstadoTela | null>(null);
  useEffect(() => {
    // Retomando uma sessão ativa, a decisão A/B/C nunca chega a aparecer —
    // não faz sentido logar "estado exibido" pra ela.
    if (temSessaoResumida) {
      return;
    }
    if (ultimoEstadoLogado.current !== resultado.estado) {
      ultimoEstadoLogado.current = resultado.estado;
      logInterceptShown(resultado.estado);
    }
  }, [resultado.estado, temSessaoResumida]);

  const parametrosSessao: ParametrosSessao | null = temSessaoResumida
    ? {
        tarefaId: sessaoAtivaResumida!.tarefaId,
        estadoTravado: sessaoAtivaResumida!.estadoTravado,
        duracaoInicialSeg: sessaoAtivaResumida!.duracaoRestanteSeg,
      }
    : resultado.estado === 'A'
      ? {
          tarefaId: resultado.tarefa.id,
          estadoTravado: null,
          duracaoInicialSeg: DURACAO_SEG_FAZER_2_MINUTOS,
        }
      : null;

  function handleFazer2Minutos() {
    registrarAcao(resultado.estado, 'sessao');
    setModo('sessao');
  }

  function handleEstouTravado() {
    registrarAcao(resultado.estado, 'travado');
    setModo('travado');
  }

  function handleSair() {
    registrarAcao(resultado.estado, 'saiu');
    onSair();
  }

  async function handleLiberarEstadoB() {
    registrarAcao('B', 'liberou');
    registrarDesbloqueioTemporario(packageName, MINUTOS_LIBERACAO_ESTADO_B);
    await abrirApp(packageName);
    onSair();
  }

  async function handleLiberarNaSessao() {
    registrarDesbloqueioTemporario(packageName, MINUTOS_LIBERACAO_ESTADO_B);
    await abrirApp(packageName);
    onSair();
  }

  function handleContinuarEstadoC() {
    const titulo = rascunhoTarefaC.trim();
    if (titulo.length === 0) {
      return;
    }
    dailyTasks.adicionarTarefa(titulo, true);
    setRascunhoTarefaC('');
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
          onFechar={onSair}
          appLabel={appLabel}
          packageName={packageName}
          onLiberarApp={handleLiberarNaSessao}
        />
      </SafeAreaView>
    );
  }

  if (modo === 'travado' && resultado.estado === 'A') {
    return (
      <TravadoFlowScreen
        uid={uid}
        tarefaContexto={resultado.tarefa}
        tarefas={tarefasParaExibir}
        origem="travado"
        criarSubtarefa={dailyTasks.criarSubtarefa}
        editarTarefa={dailyTasks.editarTarefa}
        moverTarefaParaAmanha={dailyTasks.moverTarefaParaAmanha}
        alternarTarefa={dailyTasks.alternarTarefa}
        onFechar={onSair}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="intercept-screen">
      <View style={styles.conteudo}>
        {resultado.estado === 'A' && (
          <>
            <Text style={styles.titulo}>
              Você ia abrir o {appLabel}. A tarefa de hoje é{' '}
              {resultado.tarefa.titulo}. Topa só 2 minutos dela?
            </Text>
            <View style={styles.acoes}>
              <PrimaryButton
                titulo="Fazer 2 minutos"
                onPress={handleFazer2Minutos}
              />
              <SecondaryButton
                titulo="Estou travado"
                onPress={handleEstouTravado}
              />
              <SecondaryButton titulo="Sair" onPress={handleSair} />
            </View>
          </>
        )}

        {resultado.estado === 'B' && (
          <>
            <Text style={styles.titulo}>
              Você já cumpriu o essencial de hoje. Liberar o {appLabel} por{' '}
              {MINUTOS_LIBERACAO_ESTADO_B} minutos?
            </Text>
            <View style={styles.acoes}>
              <PrimaryButton titulo="Liberar" onPress={handleLiberarEstadoB} />
              <SecondaryButton titulo="Agora não" onPress={handleSair} />
            </View>
          </>
        )}

        {resultado.estado === 'C' && (
          <>
            <Text style={styles.titulo}>
              Você ia abrir o {appLabel}. Antes: qual é uma coisa pequena para
              hoje?
            </Text>
            <TextField
              label="Uma coisa pequena para hoje"
              value={rascunhoTarefaC}
              onChangeText={setRascunhoTarefaC}
              returnKeyType="done"
            />
            <PrimaryButton
              titulo="Continuar"
              onPress={handleContinuarEstadoC}
              desabilitado={rascunhoTarefaC.trim().length === 0}
            />
          </>
        )}
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
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  acoes: {
    gap: theme.spacing.md,
  },
});
