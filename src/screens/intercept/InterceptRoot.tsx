import React from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { SnapshotDia } from '../../domain/intercept';
import { InterceptScreen, SessaoAtivaResumida } from './InterceptScreen';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';

export interface InterceptRootProps {
  packageName: string;
  appLabel: string;
  /**
   * JSON de SnapshotDia (ver domain/intercept.ts) — string, não objeto: é
   * exatamente o que a InterceptActivity (Etapa 4, Kotlin) consegue montar
   * sem precisar converter JSON aninhado em WritableMap na mão. Inválido ou
   * ausente = trata como nenhuma tarefa (`{ tarefas: [] }`).
   */
  snapshotJson: string;
  /**
   * JSON de SessaoAtivaNativa (ver native/AccessibilityDetection.ts) —
   * presente só quando o AccessibilityService encontrou uma sessão de foco
   * em andamento pro pacote (seção 5 da spec: reabrir mostrando o timer em
   * andamento). Ausente/inválido = fluxo normal (decisão A/B/C).
   */
  sessaoAtivaJson?: string;
  /**
   * Só pra a tela de debug (ver screens/debug/InterceptDebugScreen) — o
   * root real (AppRegistry.registerComponent('Intercept', ...)) nunca passa
   * isso, e "Sair"/fim de fluxo chama BackHandler.exitApp() (fecha a
   * InterceptActivity, devolvendo o controle pro Android — não existe
   * NavigationContainer nem stack pra voltar aqui, é um root separado).
   */
  aoSairOverride?: () => void;
}

function parseSnapshot(snapshotJson: string): SnapshotDia {
  try {
    const parsed: unknown = JSON.parse(snapshotJson);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as SnapshotDia).tarefas)
    ) {
      return parsed as SnapshotDia;
    }
  } catch {
    // JSON malformado (ex: extra nunca escrita) — cai pro fallback abaixo.
  }
  return { tarefas: [] };
}

/**
 * `duracaoRestanteSeg` é derivado aqui (não gravado pelo nativo) — o
 * `fimEm` (epoch ms) é a única fonte de verdade, sempre recalculado contra
 * `Date.now()` no momento em que a tela de fato monta.
 */
function parseSessaoAtiva(
  sessaoAtivaJson: string | undefined,
): SessaoAtivaResumida | null {
  if (!sessaoAtivaJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(sessaoAtivaJson) as {
      tarefaId?: string | null;
      estadoTravado?: SessaoAtivaResumida['estadoTravado'];
      fimEm?: number;
    };
    if (typeof parsed.fimEm !== 'number') {
      return null;
    }
    return {
      tarefaId: parsed.tarefaId ?? null,
      estadoTravado: parsed.estadoTravado ?? null,
      duracaoRestanteSeg: Math.round((parsed.fimEm - Date.now()) / 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Root separado registrado em index.js como 'Intercept' (ver AppRegistry) —
 * abre por cima do app bloqueado sem carregar RootNavigator/MainTabNavigator
 * inteiros. Não reaproveita nenhum provider do App.tsx (é uma árvore React
 * própria, montada por uma Activity diferente da MainActivity): monta os
 * mínimos necessários aqui mesmo — SafeAreaProvider (layout) e ToastProvider
 * (useDailyTasks/useAppBlockConfig-style hooks usam useToast em erro de
 * gravação). `useAuth` já lê o currentUser síncrono do SDK nativo do
 * Firebase (mesmo motivo documentado lá, usado pelo AppBlockedScreen) — não
 * deveria haver estado de auth "carregando" de verdade aqui, já que o
 * bloqueio de apps só é configurável com o usuário logado.
 */
export function InterceptRoot({
  packageName,
  appLabel,
  snapshotJson,
  sessaoAtivaJson,
  aoSairOverride,
}: InterceptRootProps) {
  const { user, carregando } = useAuth();

  return (
    <SafeAreaProvider>
      <ToastProvider>
        {carregando || !user ? (
          <LoadingIndicator variant="fullscreen" />
        ) : (
          <InterceptScreen
            uid={user.uid}
            packageName={packageName}
            appLabel={appLabel}
            snapshot={parseSnapshot(snapshotJson)}
            sessaoAtivaResumida={parseSessaoAtiva(sessaoAtivaJson)}
            onSair={aoSairOverride ?? (() => BackHandler.exitApp())}
          />
        )}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
