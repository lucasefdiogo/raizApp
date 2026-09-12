import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusDia, Tarefa, TipoTarefa } from '../domain/types';
import { calcularStatusDia } from '../domain/streak';
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
  salvarDailyLog,
} from '../services/firestore';
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

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

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
 * Lê dailyLogs/{hoje} no boot. Se não existir: no primeiro dia de uso
 * (nenhum dailyLog gravado) começa com TAREFAS_EXEMPLO; senão começa vazio.
 * Nada é gravado até a primeira mudança — salvarDailyLog sobrescreve o dia
 * inteiro, então "criar" e "atualizar" são a mesma operação. Toda mutação
 * é otimista: o estado local muda na hora e, se a gravação falhar, volta ao
 * que era e dispara um toast — nada de perder o toque do usuário em
 * silêncio.
 */
export function useDailyTasks(uid: string): UseDailyTasksResultado {
  const { showToast } = useToast();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [escudoUsado, setEscudoUsado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [hojeISO] = useState(() => paraISO(new Date()));
  const contadorId = useRef(0);
  // Token da leitura em curso: se outra começar (troca de uid ou recarregar
  // manual), a anterior descarta o próprio resultado ao terminar.
  const leituraRef = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++leituraRef.current;
    const aindaAtual = () => leituraRef.current === leitura;

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
    // houver) antes de cair pro exemplo do primeiro dia — nada é
    // persistido aqui, só estado local (mesmo padrão de TAREFAS_EXEMPLO;
    // a primeira mutação real do dia é o que grava, via persistir).
    const [jaUsouAntes, recorrentes] = await Promise.all([
      existeAlgumDailyLog(uid),
      buscarTarefasRecorrentesAtivas(uid),
    ]);
    if (!aindaAtual()) {
      return;
    }

    if (recorrentes.length > 0) {
      setTarefas(
        recorrentes.map(recorrente => ({
          id: `recorrente-${recorrente.id}-${hojeISO}`,
          titulo: recorrente.titulo,
          essencial: recorrente.essencial,
          concluida: false,
          origemRecorrenteId: recorrente.id,
        })),
      );
    } else {
      setTarefas(jaUsouAntes ? [] : TAREFAS_EXEMPLO);
    }
    setCarregando(false);
  }, [uid, hojeISO]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregar = useCallback(async () => {
    try {
      await carregar();
    } catch {
      showToast(MENSAGEM_FALHA_RECARREGAR);
    }
  }, [carregar, showToast]);

  const persistir = useCallback(
    async (novasTarefas: Tarefa[], mensagemFalha: string) => {
      const anterior = tarefas;
      setTarefas(novasTarefas);

      try {
        await salvarDailyLog(uid, hojeISO, {
          data: hojeISO,
          tarefas: novasTarefas,
          statusDia: calcularStatusDia(novasTarefas),
          escudoUsado,
        });
      } catch {
        setTarefas(anterior);
        showToast(mensagemFalha);
      }
    },
    [tarefas, uid, hojeISO, escudoUsado, showToast],
  );

  const alternarTarefa = useCallback(
    (id: string) => {
      persistir(
        tarefas.map(tarefa =>
          tarefa.id === id
            ? { ...tarefa, concluida: !tarefa.concluida }
            : tarefa,
        ),
        MENSAGEM_FALHA_ALTERACAO,
      );
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
        );
        const tarefasComOrigem = resultado.tarefas.map(tarefa =>
          tarefa.id === nova.id ? { ...tarefa, origemRecorrenteId } : tarefa,
        );
        persistir(tarefasComOrigem, MENSAGEM_FALHA_ADICIONAR);
      } catch {
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
      } catch {
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
