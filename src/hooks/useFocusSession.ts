import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  EstadoTravado,
  OrigemSessaoFoco,
  ResultadoSessaoFoco,
  SessaoFoco,
} from '../domain/types';
import { hojeISOLocal } from '../domain/data';
import { registrarSessaoFocoNoDia } from '../services/firestore';
import { registrarErro } from '../services/crashlytics';
import { logFocusSessionEnd } from '../services/analytics';
import {
  encerrarMomentoFoco,
  iniciarMomentoFoco,
  consultarMomentoFoco,
  consumirEncerramentoFocoExterno,
  limparSessaoAtiva,
  salvarSessaoAtiva,
} from '../native/AccessibilityDetection';

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
  bloquearAppsSelecionados?: boolean;
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
  bloqueioAtivo: boolean | null;
  encerradoExternamente: boolean;
}

const DURACAO_CONTINUAR_SEG = 10 * 60;

/**
 * Timer da SessaoFocoScreen + ações de FimSessao (seção 5). Cada "perna" do
 * timer (os 2/5/10 min iniciais, depois cada +10 min de "Continuar") vira
 * um registro `SessaoFoco` próprio em dailyLogs/{hoje}.sessoesFoco (via
 * arrayUnion — nunca lê o array antes) — nunca mexe em streakAtual (ver
 * domain/intercept.ts e regra 1.1).
 */
export function useFocusSession({
  uid,
  duracaoInicialSeg,
  tarefaId,
  origem,
  estadoTravado,
  packageName,
  bloquearAppsSelecionados = false,
  onTarefaConcluida,
}: UseFocusSessionParams): UseFocusSessionResultado {
  const [duracaoPlanejadaSeg, setDuracaoPlanejadaSeg] =
    useState(duracaoInicialSeg);
  const [segundosRestantes, setSegundosRestantes] = useState(duracaoInicialSeg);
  const [fase, setFase] = useState<FaseSessaoFoco>('contando');
  const [prazoEm, setPrazoEm] = useState(() => Date.now() + duracaoInicialSeg * 1000);
  const [bloqueioAtivo, setBloqueioAtivo] = useState<boolean | null>(null);
  const [encerradoExternamente, setEncerradoExternamente] = useState(false);
  // Uma sessão já registrada (parou/continuou/concluiu) não registra de
  // novo — os botões de FimSessao ficam desabilitados depois do primeiro
  // toque no chamador, mas isso protege contra duplo toque em voo.
  const registrandoRef = useRef(false);
  const encerradoEmRef = useRef<number | null>(null);

  useEffect(() => {
    const atualizar = () => {
      if (fase !== 'contando') return;
      const restante = Math.max(0, Math.ceil((prazoEm - Date.now()) / 1000));
      setSegundosRestantes(restante);
      if (restante === 0) setFase('concluida');
    };
    atualizar();
    const id = fase === 'contando' ? setInterval(atualizar, 1000) : undefined;
    const appState = AppState.addEventListener('change', estado => {
      if (estado === 'active') {
        atualizar();
        if (bloquearAppsSelecionados) {
          consumirEncerramentoFocoExterno()
            .then(encerrado => {
              if (encerrado) {
                encerradoEmRef.current = encerrado;
                setEncerradoExternamente(true);
              } else {
                consultarMomentoFoco().then(setBloqueioAtivo).catch(() => setBloqueioAtivo(false));
              }
            })
            .catch(() => undefined);
        }
      }
    });
    return () => { clearInterval(id); appState?.remove(); };
  }, [fase, prazoEm, bloquearAppsSelecionados]);

  useEffect(() => {
    if (!bloquearAppsSelecionados || fase !== 'contando') return;
    let ativo = true;
    iniciarMomentoFoco(prazoEm)
      .then(valor => { if (ativo) setBloqueioAtivo(valor); })
      .catch(() => { if (ativo) setBloqueioAtivo(false); });
    return () => { ativo = false; encerrarMomentoFoco(); };
  }, [bloquearAppsSelecionados, fase, prazoEm]);

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
        fimEm: prazoEm,
      });
    } else {
      limparSessaoAtiva();
    }
    return () => {
      if (packageName) {
        limparSessaoAtiva();
      }
    };
  }, [fase, prazoEm, packageName, tarefaId, estadoTravado]);

  const registrar = useCallback(
    async (resultado: ResultadoSessaoFoco) => {
      if (registrandoRef.current) {
        return;
      }
      registrandoRef.current = true;
      logFocusSessionEnd(duracaoPlanejadaSeg, resultado);
      const sessao: SessaoFoco = {
        id: `sessao-${Date.now()}`,
        tarefaId,
        origem,
        estadoTravado,
        duracaoPlanejadaSeg,
        duracaoRealSeg: Math.min(duracaoPlanejadaSeg, Math.max(0,
          Math.floor(((encerradoEmRef.current ?? Date.now()) - (prazoEm - duracaoPlanejadaSeg * 1000)) / 1000))),
        resultado,
        criadoEm: new Date().toISOString(),
      };
      try {
        await registrarSessaoFocoNoDia(uid, hojeISOLocal(), sessao);
      } catch (erro) {
        registrarErro(erro as Error, 'useFocusSession.registrar');
      }
    },
    [uid, tarefaId, origem, estadoTravado, duracaoPlanejadaSeg, prazoEm],
  );

  const continuarMais10Minutos = useCallback(() => {
    registrar('continuou');
    registrandoRef.current = false;
    setDuracaoPlanejadaSeg(DURACAO_CONTINUAR_SEG);
    setSegundosRestantes(DURACAO_CONTINUAR_SEG);
    setPrazoEm(Date.now() + DURACAO_CONTINUAR_SEG * 1000);
    setFase('contando');
  }, [registrar]);

  const marcarTarefaComoFeita = useCallback(() => {
    registrar('concluiu_tarefa');
    onTarefaConcluida?.();
  }, [registrar, onTarefaConcluida]);

  const pararAqui = useCallback(() => {
    registrar('parou');
  }, [registrar]);

  return {
    fase,
    duracaoPlanejadaSeg,
    segundosRestantes,
    podeMarcarComoFeita: tarefaId !== null,
    continuarMais10Minutos,
    marcarTarefaComoFeita,
    pararAqui,
    bloqueioAtivo,
    encerradoExternamente,
  };
}
