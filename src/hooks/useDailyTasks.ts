import { useCallback, useEffect, useState } from 'react';
import { StatusDia, Tarefa } from '../domain/types';
import { calcularStatusDia } from '../domain/streak';
import { buscarDailyLog, salvarDailyLog } from '../services/firestore';

// Conjunto inicial de tarefas para um dia que ainda não tem dailyLog no
// Firestore. Escolher as tarefas é uma funcionalidade futura (ainda não
// existe tela para isso) — por ora todo dia novo começa com este conjunto.
const TAREFAS_PADRAO: Tarefa[] = [
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

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

interface UseDailyTasksResultado {
  tarefas: Tarefa[];
  alternarTarefa: (id: string) => void;
  statusDia: StatusDia;
  carregando: boolean;
}

/**
 * Lê dailyLogs/{hoje} no boot; se ainda não existir, começa com
 * TAREFAS_PADRAO sem escrever nada (o documento só é criado no primeiro
 * toggle — salvarDailyLog sobrescreve o dia inteiro, então "criar" e
 * "atualizar" são a mesma operação). Cada toggle grava de volta o dia
 * inteiro, preservando escudoUsado como veio da leitura inicial.
 */
export function useDailyTasks(uid: string): UseDailyTasksResultado {
  const [tarefas, setTarefas] = useState<Tarefa[]>(TAREFAS_PADRAO);
  const [escudoUsado, setEscudoUsado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [hojeISO] = useState(() => paraISO(new Date()));

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const log = await buscarDailyLog(uid, hojeISO);
      if (!cancelado) {
        if (log) {
          setTarefas(log.tarefas);
          setEscudoUsado(log.escudoUsado);
        }
        setCarregando(false);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid, hojeISO]);

  const alternarTarefa = useCallback(
    (id: string) => {
      const novasTarefas = tarefas.map(tarefa =>
        tarefa.id === id ? { ...tarefa, concluida: !tarefa.concluida } : tarefa,
      );
      setTarefas(novasTarefas);

      salvarDailyLog(uid, hojeISO, {
        data: hojeISO,
        tarefas: novasTarefas,
        statusDia: calcularStatusDia(novasTarefas),
        escudoUsado,
      });
    },
    [tarefas, uid, hojeISO, escudoUsado],
  );

  const statusDia = calcularStatusDia(tarefas);

  return { tarefas, alternarTarefa, statusDia, carregando };
}
