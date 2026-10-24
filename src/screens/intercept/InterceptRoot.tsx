import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { SnapshotDia } from '../../domain/intercept';
import {
  irParaTelaInicial,
  listarAppsInstalados,
  parseVisaoBloqueio,
} from '../../native/AccessibilityDetection';
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
  /** Estado do saldo de blocos (extra `estadoBloqueioJson` da InterceptActivity). Ausente = a tela lê do nativo. */
  estadoBloqueioJson?: string;
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
 * abre por cima do app interceptado sem carregar RootNavigator/MainTabNavigator
 * inteiros. Não reaproveita nenhum provider do App.tsx (é uma árvore React
 * própria, montada por uma Activity diferente da MainActivity): monta os
 * mínimos necessários aqui mesmo — SafeAreaProvider (layout) e ToastProvider
 * (hooks como useDailyTasks usam useToast em erro de gravação). `useAuth` já
 * lê o currentUser síncrono do SDK nativo do Firebase (mesmo motivo
 * documentado lá, usado por este root) — não deveria haver estado de auth
 * "carregando" de verdade aqui, já que a interceptação só é configurável com
 * o usuário logado.
 */
export function InterceptRoot({
  packageName,
  appLabel,
  snapshotJson,
  sessaoAtivaJson,
  estadoBloqueioJson,
}: InterceptRootProps) {
  const { user, carregando } = useAuth();
  // Nenhum extra traz o ícone hoje (só appLabel) — resolvido via o mesmo
  // listarAppsInstalados() que já popula a BloqueioAppsScreen, em vez de
  // criar um novo extra Kotlin só pra isso (HU-11, RN01).
  const [appIconeBase64, setAppIconeBase64] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      let icone = '';
      try {
        const apps = await listarAppsInstalados();
        icone = apps.find(app => app.packageName === packageName)?.iconeBase64 ?? '';
      } catch {
        icone = '';
      }
      if (ativo) {
        setAppIconeBase64(icone);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [packageName]);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        {carregando || !user || appIconeBase64 === null ? (
          <LoadingIndicator variant="fullscreen" />
        ) : (
          <InterceptScreen
            uid={user.uid}
            packageName={packageName}
            appLabel={appLabel}
            appIconeBase64={appIconeBase64}
            snapshot={parseSnapshot(snapshotJson)}
            visaoInicial={parseVisaoBloqueio(estadoBloqueioJson)}
            sessaoAtivaResumida={parseSessaoAtiva(sessaoAtivaJson)}
            onSair={async () => {
              // Vai pra Home de verdade antes de fechar — só fechar (exitApp)
              // revelaria a tarefa do app bloqueado por baixo (RootoraAccessibilityService
              // nunca a move/limpa), e ele seria reinterceptado na hora.
              await irParaTelaInicial();
              BackHandler.exitApp();
            }}
            onFecharAposAbrir={() => BackHandler.exitApp()}
          />
        )}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
