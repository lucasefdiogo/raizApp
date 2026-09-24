import { useCallback, useState } from 'react';
import { EstadoTravado, Tarefa } from '../domain/types';
import {
  DURACAO_SEG_CONFUSAO,
  DURACAO_SEG_DESCANSO_ENERGIA,
  DURACAO_SEG_MEDO,
  DURACAO_SEG_TEDIO,
} from '../domain/intercept';

export type PassoTravado = 'escolha' | 'resposta' | 'sessao' | 'concluido';

export interface ParametrosSessaoTravado {
  tarefaId: string | null;
  estadoTravado: EstadoTravado;
  duracaoPlanejadaSeg: number;
}

interface UseTravadoFlowParams {
  /** Tarefa que estava travando — ausente quando não há essencial pendente (ver domain/intercept.ts, selecionarTarefaIntercept). */
  tarefaContexto: Tarefa | null;
  criarSubtarefa: (titulo: string, tarefaPaiId?: string) => string | null;
  editarTarefa: (id: string, campos: Partial<Pick<Tarefa, 'titulo'>>) => void;
  moverTarefaParaAmanha: (tarefa: Tarefa, quando?: string) => Promise<void>;
}

interface UseTravadoFlowResultado {
  passo: PassoTravado;
  estadoSelecionado: EstadoTravado | null;
  /** true só quando há uma tarefa de contexto — controla se "Fazer uma versão menor"/"Passar para amanhã" aparecem no passo energia. */
  temTarefaContexto: boolean;
  selecionarEstado: (estado: EstadoTravado) => void;
  voltar: () => void;
  /** Passo `confusao`: cria a subtarefa a partir do primeiro passo físico e abre a sessão de 2 min. */
  iniciarConfusao: (tituloSubtarefa: string) => void;
  /** Passos `medo`/`tedio`: abre a sessão de 5 min direto, sem criar subtarefa. */
  iniciarMedoOuTedio: () => void;
  /** Passo `energia` → "Descansar 10 minutos longe do celular". */
  iniciarDescanso: () => void;
  /** Passo `energia` → "Fazer uma versão menor": edita o título da tarefa de contexto e encerra o fluxo. */
  salvarVersaoMenor: (novoTitulo: string) => void;
  /** Passo `energia` → "Passar para amanhã": move a tarefa de contexto e encerra o fluxo. */
  moverParaAmanha: (quando?: string) => Promise<void>;
  parametrosSessao: ParametrosSessaoTravado | null;
}

/**
 * Máquina de passos do TravadoFlow (seção 4 da spec 09-ponte-fuga-tarefa) —
 * mesmo espírito do Onboarding (1 componente, estado interno), reutilizável
 * nas 3 entradas (botão da Home, toque longo no TaskCard e, na Etapa 3, a
 * InterceptScreen). Não fala com Firestore diretamente: recebe as mutações
 * de tarefa já prontas de fora (useDailyTasks), pra não duplicar a
 * persistência otimista que já vive lá.
 */
export function useTravadoFlow({
  tarefaContexto,
  criarSubtarefa,
  editarTarefa,
  moverTarefaParaAmanha,
}: UseTravadoFlowParams): UseTravadoFlowResultado {
  const [passo, setPasso] = useState<PassoTravado>('escolha');
  const [estadoSelecionado, setEstadoSelecionado] =
    useState<EstadoTravado | null>(null);
  const [parametrosSessao, setParametrosSessao] =
    useState<ParametrosSessaoTravado | null>(null);

  const selecionarEstado = useCallback((estado: EstadoTravado) => {
    setEstadoSelecionado(estado);
    setPasso('resposta');
  }, []);

  const voltar = useCallback(() => {
    setEstadoSelecionado(null);
    setPasso('escolha');
  }, []);

  const iniciarConfusao = useCallback(
    (tituloSubtarefa: string) => {
      const idSubtarefa = criarSubtarefa(
        tituloSubtarefa,
        tarefaContexto?.id,
      );
      if (idSubtarefa === null) {
        return;
      }
      setParametrosSessao({
        tarefaId: idSubtarefa,
        estadoTravado: 'confusao',
        duracaoPlanejadaSeg: DURACAO_SEG_CONFUSAO,
      });
      setPasso('sessao');
    },
    [criarSubtarefa, tarefaContexto],
  );

  const iniciarMedoOuTedio = useCallback(() => {
    if (estadoSelecionado !== 'medo' && estadoSelecionado !== 'tedio') {
      return;
    }
    setParametrosSessao({
      tarefaId: tarefaContexto?.id ?? null,
      estadoTravado: estadoSelecionado,
      duracaoPlanejadaSeg:
        estadoSelecionado === 'medo' ? DURACAO_SEG_MEDO : DURACAO_SEG_TEDIO,
    });
    setPasso('sessao');
  }, [estadoSelecionado, tarefaContexto]);

  const iniciarDescanso = useCallback(() => {
    setParametrosSessao({
      tarefaId: tarefaContexto?.id ?? null,
      estadoTravado: 'energia',
      duracaoPlanejadaSeg: DURACAO_SEG_DESCANSO_ENERGIA,
    });
    setPasso('sessao');
  }, [tarefaContexto]);

  const salvarVersaoMenor = useCallback(
    (novoTitulo: string) => {
      if (!tarefaContexto) {
        return;
      }
      editarTarefa(tarefaContexto.id, { titulo: novoTitulo });
      setPasso('concluido');
    },
    [tarefaContexto, editarTarefa],
  );

  const moverParaAmanha = useCallback(
    async (quando?: string) => {
      if (!tarefaContexto) {
        return;
      }
      await moverTarefaParaAmanha(tarefaContexto, quando);
      setPasso('concluido');
    },
    [tarefaContexto, moverTarefaParaAmanha],
  );

  return {
    passo,
    estadoSelecionado,
    temTarefaContexto: tarefaContexto !== null,
    selecionarEstado,
    voltar,
    iniciarConfusao,
    iniciarMedoOuTedio,
    iniciarDescanso,
    salvarVersaoMenor,
    moverParaAmanha,
    parametrosSessao,
  };
}
