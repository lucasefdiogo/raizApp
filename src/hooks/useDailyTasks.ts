import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusDia, Tarefa } from '../domain/types';
import { calcularStatusDia } from '../domain/streak';
import {
  adicionarTarefa as adicionarTarefaNoDia,
  editarTarefa as editarTarefaNoDia,
  limiteEssenciaisAtingido as limiteEssenciaisAtingidoDominio,
  removerTarefa as removerTarefaNoDia,
} from '../domain/dailyTasks';
import {
  buscarDailyLog,
  existeAlgumDailyLog,
  salvarDailyLog,
} from '../services/firestore';

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

const MENSAGEM_FALHA_GRAVACAO =
  'Não deu pra salvar agora. Suas tarefas seguem como estavam — tenta de novo em instantes.';

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

interface UseDailyTasksResultado {
  tarefas: Tarefa[];
  alternarTarefa: (id: string) => void;
  adicionarTarefa: (titulo: string, essencial: boolean) => void;
  editarTarefa: (
    id: string,
    campos: Partial<Pick<Tarefa, 'titulo' | 'essencial'>>,
  ) => void;
  removerTarefa: (id: string) => void;
  statusDia: StatusDia;
  carregando: boolean;
  erro: string | null;
  limiteEssenciaisAtingido: boolean;
}

/**
 * Lê dailyLogs/{hoje} no boot. Se não existir: no primeiro dia de uso
 * (nenhum dailyLog gravado) começa com TAREFAS_EXEMPLO; senão começa vazio.
 * Nada é gravado até a primeira mudança — salvarDailyLog sobrescreve o dia
 * inteiro, então "criar" e "atualizar" são a mesma operação. Toda mutação
 * é otimista: o estado local muda na hora e, se a gravação falhar, volta ao
 * que era e expõe `erro` — nada de perder o toque do usuário em silêncio.
 */
export function useDailyTasks(uid: string): UseDailyTasksResultado {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [escudoUsado, setEscudoUsado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [hojeISO] = useState(() => paraISO(new Date()));
  const contadorId = useRef(0);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const log = await buscarDailyLog(uid, hojeISO);
      if (cancelado) {
        return;
      }

      if (log) {
        setTarefas(log.tarefas);
        setEscudoUsado(log.escudoUsado);
        setCarregando(false);
        return;
      }

      const jaUsouAntes = await existeAlgumDailyLog(uid);
      if (cancelado) {
        return;
      }

      setTarefas(jaUsouAntes ? [] : TAREFAS_EXEMPLO);
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid, hojeISO]);

  const persistir = useCallback(
    async (novasTarefas: Tarefa[]) => {
      const anterior = tarefas;
      setErro(null);
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
        setErro(MENSAGEM_FALHA_GRAVACAO);
      }
    },
    [tarefas, uid, hojeISO, escudoUsado],
  );

  const alternarTarefa = useCallback(
    (id: string) => {
      persistir(
        tarefas.map(tarefa =>
          tarefa.id === id
            ? { ...tarefa, concluida: !tarefa.concluida }
            : tarefa,
        ),
      );
    },
    [tarefas, persistir],
  );

  const adicionarTarefa = useCallback(
    (titulo: string, essencial: boolean) => {
      const resultado = adicionarTarefaNoDia(tarefas, {
        id: `nova-${Date.now()}-${contadorId.current++}`,
        titulo,
        essencial,
        concluida: false,
      });

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      persistir(resultado.tarefas);
    },
    [tarefas, persistir],
  );

  const editarTarefa = useCallback(
    (id: string, campos: Partial<Pick<Tarefa, 'titulo' | 'essencial'>>) => {
      const resultado = editarTarefaNoDia(tarefas, id, campos);

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      persistir(resultado.tarefas);
    },
    [tarefas, persistir],
  );

  const removerTarefa = useCallback(
    (id: string) => {
      persistir(removerTarefaNoDia(tarefas, id));
    },
    [tarefas, persistir],
  );

  const statusDia = calcularStatusDia(tarefas);

  return {
    tarefas,
    alternarTarefa,
    adicionarTarefa,
    editarTarefa,
    removerTarefa,
    statusDia,
    carregando,
    erro,
    limiteEssenciaisAtingido: limiteEssenciaisAtingidoDominio(tarefas),
  };
}
