import { useCallback, useMemo, useState } from 'react';
import { Tarefa } from '../domain/types';
import { calcularStatusDia } from '../domain/streak';

// Dados mockados para a primeira versão da Home — integração com
// dailyLogs/{data} no Firestore fica para uma próxima tarefa.
const TAREFAS_MOCK: Tarefa[] = [
  { id: '1', titulo: 'Abrir o material de estudo por 5 minutos', essencial: true, concluida: false },
  { id: '2', titulo: 'Guardar o celular durante o almoço', essencial: false, concluida: false },
  { id: '3', titulo: 'Escrever uma frase sobre o que pretende fazer hoje', essencial: false, concluida: false },
];

export function useDailyTasks() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(TAREFAS_MOCK);

  const alternarTarefa = useCallback((id: string) => {
    setTarefas(atual =>
      atual.map(tarefa =>
        tarefa.id === id ? { ...tarefa, concluida: !tarefa.concluida } : tarefa,
      ),
    );
  }, []);

  const statusDia = useMemo(() => calcularStatusDia(tarefas), [tarefas]);

  return { tarefas, alternarTarefa, statusDia };
}
