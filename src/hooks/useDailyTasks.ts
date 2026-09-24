import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { StatusDia, Tarefa, TipoTarefa } from '../domain/types';
import { calcularStatusDia } from '../domain/streak';
import { hojeISOLocal } from '../domain/data';
import {
  adicionarTarefa as adicionarTarefaNoDia,
  editarTarefa as editarTarefaNoDia,
  limiteEssenciaisAtingido as limiteEssenciaisAtingidoDominio,
  removerTarefa as removerTarefaNoDia,
} from '../domain/dailyTasks';
import {
  buscarDailyLog,
  buscarTarefasRecorrentesAtivas,
  criarTarefaRecorrente,
  desativarTarefaRecorrente,
  existeAlgumDailyLog,
  garantirDailyLogDoDia,
  salvarDailyLog,
} from '../services/firestore';
import { logTarefaConcluida, logTarefaCriada } from '../services/analytics';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';

// Tarefas de exemplo semeadas SÓ no primeiro dia de uso (nenhum dailyLog
// gravado ainda) — servem de modelo pra pessoa entender o formato. Depois
// que existe qualquer dailyLog, todo dia novo começa vazio e a pessoa monta
// a própria lista.
const TAREFAS_EXEMPLO: Tarefa[] = [
  {
    id: '1',
    titulo: 'Abrir o material de estudo por 5 minutos',
    essencial: true,
    concluida: false,
  },
  {
    id: '2',
    titulo: 'Guardar o celular durante o almoço',
    essencial: false,
    concluida: false,
  },
  {
    id: '3',
    titulo: 'Escrever uma frase sobre o que pretende fazer hoje',
    essencial: false,
    concluida: false,
  },
];

const MENSAGEM_FALHA_ALTERACAO =
  'Não conseguimos salvar sua alteração. Tente de novo.';
const MENSAGEM_FALHA_ADICIONAR =
  'Não conseguimos adicionar a tarefa agora. Tente de novo.';
const MENSAGEM_FALHA_RECARREGAR =
  'Não conseguimos atualizar agora. Tente de novo.';
const MENSAGEM_FALHA_PARAR_DE_REPETIR =
  'Não conseguimos salvar agora. Tente de novo.';

interface UseDailyTasksResultado {
  tarefas: Tarefa[];
  alternarTarefa: (id: string) => void;
  /**
   * `repetirTodosOsDias` (default false): cria a tarefa recorrente em
   * essentialTasks ANTES de gravar a tarefa de hoje, e só grava a de hoje
   * (já com origemRecorrenteId) se aquilo funcionar — nunca deixa uma
   * tarefa avulsa órfã quando o usuário pediu repetição.
   */
  adicionarTarefa: (
    titulo: string,
    essencial: boolean,
    tipo?: TipoTarefa,
    duracaoMinutos?: number,
    repetirTodosOsDias?: boolean,
  ) => void;
  editarTarefa: (
    id: string,
    campos: Partial<Pick<Tarefa, 'titulo' | 'essencial'>>,
  ) => void;
  removerTarefa: (id: string) => void;
  /**
   * Remove só a entrada de hoje de uma tarefa recorrente — o essentialTasks
   * de origem não é tocado, então ela volta a aparecer amanhã normalmente.
   * Mesmo efeito de removerTarefa (nome próprio só pra deixar a intenção
   * clara no menu de gerenciamento — ver RecurringTaskActionSheet).
   */
  removerTarefaHoje: (id: string) => void;
  /**
   * "Parar de repetir": desativa o essentialTasks de origem — a entrada de
   * hoje permanece intacta (não mexe em `tarefas`), só deixa de ser criada
   * nos dias seguintes. `tarefaId` não é usado na gravação em si, só mantém
   * a chamada simétrica com removerTarefaHoje no call site do menu.
   */
  pararDeRepetir: (tarefaId: string, origemRecorrenteId: string) => void;
  statusDia: StatusDia;
  carregando: boolean;
  limiteEssenciaisAtingido: boolean;
  /**
   * Força uma nova leitura de dailyLogs/{hoje} sob demanda (pull-to-refresh),
   * sem voltar a `carregando` — o conteúdo já visível permanece na tela. Em
   * falha de rede, dispara o toast de erro em vez de rejeitar.
   */
  recarregar: () => Promise<void>;
}

/**
 * Lê dailyLogs/{hoje} no boot. Se não existir: o estado local começa com as
 * recorrentes ativas pré-populadas (ou TAREFAS_EXEMPLO no primeiro dia de
 * uso, sem nenhum dailyLog gravado ainda) — e garantirDailyLogDoDia grava
 * esse mesmo dia no Firestore (tarefas reais a partir de essentialTasks,
 * nunca o exemplo) na hora, não só na primeira mutação. Sem isso, um dia em
 * que o usuário abre o app e não toca em nenhuma tarefa nunca gera registro
 * e aparece como `sem_registro` no histórico/desafios em vez de `perdido`
 * (ver domain/progress.ts). Também recarrega sozinho se o app voltar do
 * background num dia local diferente do que tinha carregado (AppState),
 * então não fica preso com as tarefas de ontem até algum outro gatilho
 * aparecer. Depois da leitura inicial, toda mutação continua otimista: o
 * estado local muda na hora e, se a gravação falhar, volta ao que era e
 * dispara um toast — nada de perder o toque do usuário em silêncio.
 */
export function useDailyTasks(uid: string): UseDailyTasksResultado {
  const { showToast } = useToast();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [escudoUsado, setEscudoUsado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const contadorId = useRef(0);
  // Token da leitura em curso: se outra começar (troca de uid ou recarregar
  // manual), a anterior descarta o próprio resultado ao terminar.
  const leituraRef = useRef(0);
  // Data (YYYY-MM-DD local) que a leitura mais recente considerou "hoje" —
  // usado só pelo listener de AppState abaixo, pra saber se a virada do dia
  // aconteceu enquanto o app estava em background.
  const dataCarregadaRef = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;
    const aindaAtual = () => leituraRef.current === leitura;
    // Recalculado a cada chamada — nunca "congela" no dia em que o hook
    // montou. Sem isso, um app que fica aberto (foreground ou background,
    // sem o processo morrer) atravessando a meia-noite continua lendo/
    // gravando o dailyLog de ONTEM como se fosse hoje: como o dailyLog de
    // ontem já existe e tem concluida:true, o código nem chega a cair no
    // ramo de pré-popular a partir de essentialTasks — é isso que fazia
    // tarefa recorrente aparecer concluída no dia seguinte.
    const hojeISO = hojeISOLocal();
    dataCarregadaRef.current = hojeISO;

    const log = await buscarDailyLog(uid, hojeISO);
    if (!aindaAtual()) {
      return;
    }

    if (log) {
      setTarefas(log.tarefas);
      setEscudoUsado(log.escudoUsado);
      setCarregando(false);
      return;
    }

    // Dia sem dailyLog ainda: pré-popula com as recorrentes ativas (se
    // houver) antes de cair pro exemplo do primeiro dia.
    const [jaUsouAntes, recorrentes] = await Promise.all([
      existeAlgumDailyLog(uid),
      buscarTarefasRecorrentesAtivas(uid),
    ]);
    if (!aindaAtual()) {
      return;
    }

    const tarefasRecorrentes: Tarefa[] = recorrentes.map(recorrente => {
      // Instância nova pra hoje: nasce sempre concluida:false, com um
      // id novo (embute a data de hoje, nunca reaproveita o de outro
      // dia) — nenhum campo de estado de conclusão vem de dia anterior.
      const tarefa: Tarefa = {
        id: `recorrente-${recorrente.id}-${hojeISO}`,
        titulo: recorrente.titulo,
        essencial: recorrente.essencial,
        concluida: false,
        origemRecorrenteId: recorrente.id,
      };
      if (recorrente.tipo === 'exercicio') {
        tarefa.tipo = recorrente.tipo;
        if (recorrente.duracaoMinutos !== undefined) {
          tarefa.duracaoMinutos = recorrente.duracaoMinutos;
        }
      }
      return tarefa;
    });

    setTarefas(
      tarefasRecorrentes.length > 0
        ? tarefasRecorrentes
        : jaUsouAntes
          ? []
          : TAREFAS_EXEMPLO,
    );
    setCarregando(false);

    // Grava o dia real no Firestore com as mesmas tarefas do estado local
    // (nunca TAREFAS_EXEMPLO — essa é só demonstração visual do primeiro
    // dia, o registro persistido reflete o que existe de fato em
    // essentialTasks). Idempotente: se outra escrita já criou o documento
    // nesse meio-tempo, garantirDailyLogDoDia não sobrescreve.
    await garantirDailyLogDoDia(uid, hojeISO, tarefasRecorrentes);
  }, [uid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregar = useCallback(async () => {
    try {
      await carregar();
    } catch (erro) {
      registrarErro(erro as Error, 'useDailyTasks.recarregar');
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  // App deixado em background durante a virada do dia e trazido de volta:
  // sem isso, o processo continua vivo com o dailyLog de ontem em memória
  // até algum outro gatilho (pull-to-refresh) recarregar. Só recarrega
  // quando a data local realmente mudou — não a cada volta ao primeiro
  // plano (a maioria delas é no mesmo dia, recarregar à toa é desperdício).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', estado => {
      if (estado === 'active' && dataCarregadaRef.current !== hojeISOLocal()) {
        recarregar();
      }
    });
    return () => subscription.remove();
  }, [recarregar]);

  const persistir = useCallback(
    async (novasTarefas: Tarefa[], mensagemFalha: string) => {
      const anterior = tarefas;
      setTarefas(novasTarefas);
      // Recalculado a cada chamada — mesmo racional de carregar(): grava
      // sempre no dailyLog do dia real da gravação, nunca no de um dia
      // anterior "congelado" desde o mount do hook.
      const hojeISO = hojeISOLocal();

      try {
        await salvarDailyLog(uid, hojeISO, {
          data: hojeISO,
          tarefas: novasTarefas,
          statusDia: calcularStatusDia(novasTarefas),
          escudoUsado,
        });
      } catch (erro) {
        registrarErro(erro as Error, 'useDailyTasks.persistir');
        setTarefas(anterior);
        showToast(mensagemFalha);
      }
    },
    [tarefas, uid, escudoUsado, showToast],
  );

  const alternarTarefa = useCallback(
    (id: string) => {
      const tarefa = tarefas.find(item => item.id === id);
      const vaiConcluir = tarefa !== undefined && !tarefa.concluida;

      persistir(
        tarefas.map(item =>
          item.id === id ? { ...item, concluida: !item.concluida } : item,
        ),
        MENSAGEM_FALHA_ALTERACAO,
      );

      // Só ao concluir, nunca ao desmarcar — ver services/analytics.ts.
      if (vaiConcluir && tarefa) {
        logTarefaConcluida(tarefa.essencial, tarefa.tipo ?? 'padrao');
      }
    },
    [tarefas, persistir],
  );

  const adicionarTarefa = useCallback(
    async (
      titulo: string,
      essencial: boolean,
      tipo: TipoTarefa = 'padrao',
      duracaoMinutos?: number,
      repetirTodosOsDias: boolean = false,
    ) => {
      const nova: Tarefa = {
        id: `nova-${Date.now()}-${contadorId.current++}`,
        titulo,
        essencial,
        concluida: false,
      };
      // Só grava os campos de exercício quando são de fato exercício —
      // tarefa comum continua com o mesmo shape de antes da Fase 2.
      if (tipo === 'exercicio') {
        nova.tipo = 'exercicio';
        if (duracaoMinutos !== undefined) {
          nova.duracaoMinutos = duracaoMinutos;
        }
      }

      const resultado = adicionarTarefaNoDia(tarefas, nova);

      if (!resultado.ok) {
        showToast(resultado.erro);
        return;
      }

      logTarefaCriada(essencial, tipo);

      if (!repetirTodosOsDias) {
        persistir(resultado.tarefas, MENSAGEM_FALHA_ADICIONAR);
        return;
      }

      // Cria a recorrente ANTES de gravar a tarefa de hoje — se falhar,
      // não grava nada (nem a avulsa): melhor nada acontecer e o usuário
      // tentar de novo do que criar uma tarefa que ele pediu explicitamente
      // pra repetir e ela não repetir, sem avisar.
      const tituloGravado =
        resultado.tarefas.find(t => t.id === nova.id)?.titulo ?? titulo;
      try {
        const origemRecorrenteId = await criarTarefaRecorrente(
          uid,
          tituloGravado,
          essencial,
          tipo,
          duracaoMinutos,
        );
        const tarefasComOrigem = resultado.tarefas.map(tarefa =>
          tarefa.id === nova.id ? { ...tarefa, origemRecorrenteId } : tarefa,
        );
        persistir(tarefasComOrigem, MENSAGEM_FALHA_ADICIONAR);
      } catch (erro) {
        registrarErro(erro as Error, 'useDailyTasks.adicionarTarefa');
        showToast(MENSAGEM_FALHA_ADICIONAR);
      }
    },
    [tarefas, persistir, showToast, uid],
  );

  const editarTarefa = useCallback(
    (id: string, campos: Partial<Pick<Tarefa, 'titulo' | 'essencial'>>) => {
      const resultado = editarTarefaNoDia(tarefas, id, campos);

      if (!resultado.ok) {
        showToast(resultado.erro);
        return;
      }

      persistir(resultado.tarefas, MENSAGEM_FALHA_ALTERACAO);
    },
    [tarefas, persistir, showToast],
  );

  const removerTarefa = useCallback(
    (id: string) => {
      persistir(removerTarefaNoDia(tarefas, id), MENSAGEM_FALHA_ALTERACAO);
    },
    [tarefas, persistir],
  );

  // Mesma operação de removerTarefa (remove só a entrada de hoje) — nome
  // próprio pra deixar clara a intenção no menu de tarefa recorrente, que
  // nunca mexe no essentialTasks de origem por essa via.
  const removerTarefaHoje = useCallback(
    (id: string) => {
      persistir(removerTarefaNoDia(tarefas, id), MENSAGEM_FALHA_ALTERACAO);
    },
    [tarefas, persistir],
  );

  const pararDeRepetir = useCallback(
    async (_tarefaId: string, origemRecorrenteId: string) => {
      try {
        await desativarTarefaRecorrente(uid, origemRecorrenteId);
      } catch (erro) {
        registrarErro(erro as Error, 'useDailyTasks.pararDeRepetir');
        showToast(MENSAGEM_FALHA_PARAR_DE_REPETIR);
      }
    },
    [uid, showToast],
  );

  const statusDia = calcularStatusDia(tarefas);

  return {
    tarefas,
    alternarTarefa,
    adicionarTarefa,
    editarTarefa,
    removerTarefa,
    removerTarefaHoje,
    pararDeRepetir,
    statusDia,
    carregando,
    limiteEssenciaisAtingido: limiteEssenciaisAtingidoDominio(tarefas),
    recarregar,
  };
}
