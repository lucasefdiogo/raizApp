import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EstadoTravado,
  OrigemSessaoFoco,
  ResultadoSessaoFoco,
  SessaoFoco,
} from '../domain/types';
import { registrarSessaoFoco } from '../domain/intercept';
import { hojeISOLocal } from '../domain/data';
import { buscarDailyLog, registrarSessaoFocoNoDia } from '../services/firestore';
import { registrarErro } from '../services/crashlytics';
import { logFocusSessionEnd } from '../services/analytics';
import { limparSessaoAtiva, salvarSessaoAtiva } from '../native/AccessibilityDetection';

export type FaseSessaoFoco = 'contando' | 'concluida';

interface UseFocusSessionParams {
  uid: string;
  duracaoInicialSeg: number;
  tarefaId: string | null;
  origem: OrigemSessaoFoco;
  estadoTravado: EstadoTravado | null;
  /**
   * Só quando origem === 'interceptacao' — espelha "sessão ativa" em
   * SharedPreferences enquanto fase === 'contando' (seção 5 da spec:
   * reabrir a interceptação mostrando o timer em andamento, Etapa 4).
   * Ausente = não espelha nada (TravadoFlow a partir da Home/TaskCard não
   * tem um app de origem pra reabrir).
   */
  packageName?: string;
  /**
   * Chamado ao escolher "Marcar a tarefa como feita" — quem usa o hook
   * decide o que "concluir" significa (ex: useDailyTasks.alternarTarefa,
   * com o guard de não desmarcar se já tiver sido concluída por outro
   * caminho enquanto a sessão rodava).
   */
  onTarefaConcluida?: () => void;
}

interface UseFocusSessionResultado {
  fase: FaseSessaoFoco;
  duracaoPlanejadaSeg: number;
  segundosRestantes: number;
  /** Sempre que houver tarefaId (ver seção 5 da spec 09-ponte-fuga-tarefa). */
  podeMarcarComoFeita: boolean;
  continuarMais10Minutos: () => void;
  marcarTarefaComoFeita: () => void;
  pararAqui: () => void;
  /** Só registra a sessão como 'liberou_app' — quem chama (SessaoFocoScreen) decide o desbloqueio nativo de fato. */
  liberarApp: () => void;
}

const DURACAO_CONTINUAR_SEG = 10 * 60;

/**
 * Timer da SessaoFocoScreen + ações de FimSessao (seção 5). Cada "perna" do
 * timer (os 2/5/10 min iniciais, depois cada +10 min de "Continuar") vira
 * um registro `SessaoFoco` próprio em dailyLogs/{hoje}.sessoesFoco — nunca
 * mexe em streakAtual (ver domain/intercept.ts e regra 1.1). "Liberar o app
 * por 15 minutos" (só quando origem = interceptacao) chega na Etapa 3, com
 * o resto da integração de bloqueio — não existe aqui ainda.
 */
export function useFocusSession({
  uid,
  duracaoInicialSeg,
  tarefaId,
  origem,
  estadoTravado,
  packageName,
  onTarefaConcluida,
}: UseFocusSessionParams): UseFocusSessionResultado {
  const [duracaoPlanejadaSeg, setDuracaoPlanejadaSeg] =
    useState(duracaoInicialSeg);
  const [segundosRestantes, setSegundosRestantes] = useState(duracaoInicialSeg);
  const [fase, setFase] = useState<FaseSessaoFoco>('contando');
  // Uma sessão já registrada (parou/continuou/concluiu) não registra de
  // novo — os botões de FimSessao ficam desabilitados depois do primeiro
  // toque no chamador, mas isso protege contra duplo toque em voo.
  const registrandoRef = useRef(false);

  useEffect(() => {
    if (fase !== 'contando') {
      return;
    }
    if (segundosRestantes <= 0) {
      setFase('concluida');
      return;
    }
    const id = setTimeout(() => setSegundosRestantes(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [fase, segundosRestantes]);

  // Espelha "sessão ativa" em SharedPreferences — só uma vez por perna do
  // timer (não a cada segundo, por isso a dependência é duracaoPlanejadaSeg,
  // estável dentro de uma perna, não segundosRestantes). Limpa ao sair de
  // 'contando' (naturalmente ou por ação) e no unmount (usuário fechou o
  // fluxo inteiro sem passar por nenhuma ação de FimSessao).
  useEffect(() => {
    if (!packageName) {
      return;
    }
    if (fase === 'contando') {
      salvarSessaoAtiva({
        packageName,
        tarefaId,
        estadoTravado,
        fimEm: Date.now() + duracaoPlanejadaSeg * 1000,
      });
    } else {
      limparSessaoAtiva();
    }
    return () => {
      if (packageName) {
        limparSessaoAtiva();
      }
    };
  }, [fase, duracaoPlanejadaSeg, packageName, tarefaId, estadoTravado]);

  const registrar = useCallback(
    async (resultado: ResultadoSessaoFoco) => {
      if (registrandoRef.current) {
        return;
      }
      registrandoRef.current = true;
      logFocusSessionEnd(duracaoPlanejadaSeg, resultado);
      try {
        const hoje = hojeISOLocal();
        const log = await buscarDailyLog(uid, hoje);
        const sessao: SessaoFoco = {
          id: `sessao-${Date.now()}`,
          tarefaId,
          origem,
          estadoTravado,
          duracaoPlanejadaSeg,
          duracaoRealSeg: duracaoPlanejadaSeg,
          resultado,
          criadoEm: new Date().toISOString(),
        };
        await registrarSessaoFocoNoDia(
          uid,
          hoje,
          registrarSessaoFoco(log?.sessoesFoco ?? [], sessao),
        );
      } catch (erro) {
        registrarErro(erro as Error, 'useFocusSession.registrar');
      }
    },
    [uid, tarefaId, origem, estadoTravado, duracaoPlanejadaSeg],
  );

  const continuarMais10Minutos = useCallback(() => {
    registrar('continuou');
    registrandoRef.current = false;
    setDuracaoPlanejadaSeg(DURACAO_CONTINUAR_SEG);
    setSegundosRestantes(DURACAO_CONTINUAR_SEG);
    setFase('contando');
  }, [registrar]);

  const marcarTarefaComoFeita = useCallback(() => {
    registrar('concluiu_tarefa');
    onTarefaConcluida?.();
  }, [registrar, onTarefaConcluida]);

  const pararAqui = useCallback(() => {
    registrar('parou');
  }, [registrar]);

  const liberarApp = useCallback(() => {
    registrar('liberou_app');
  }, [registrar]);

  return {
    fase,
    duracaoPlanejadaSeg,
    segundosRestantes,
    podeMarcarComoFeita: tarefaId !== null,
    continuarMais10Minutos,
    marcarTarefaComoFeita,
    pararAqui,
    liberarApp,
  };
}
