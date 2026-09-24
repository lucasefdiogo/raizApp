import { act, renderHook } from '@testing-library/react-native';
import { useTravadoFlow } from './useTravadoFlow';
import { Tarefa } from '../domain/types';
import {
  DURACAO_SEG_CONFUSAO,
  DURACAO_SEG_DESCANSO_ENERGIA,
  DURACAO_SEG_MEDO,
  DURACAO_SEG_TEDIO,
} from '../domain/intercept';

const TAREFA_CONTEXTO: Tarefa = {
  id: 'tarefa-1',
  titulo: 'Escrever relatório',
  essencial: true,
  concluida: false,
};

async function montar(tarefaContexto: Tarefa | null = TAREFA_CONTEXTO) {
  const criarSubtarefa = jest.fn().mockReturnValue('subtarefa-1');
  const editarTarefa = jest.fn();
  const moverTarefaParaAmanha = jest.fn().mockResolvedValue(undefined);
  const hook = await renderHook(() =>
    useTravadoFlow({
      tarefaContexto,
      criarSubtarefa,
      editarTarefa,
      moverTarefaParaAmanha,
    }),
  );
  return { ...hook, criarSubtarefa, editarTarefa, moverTarefaParaAmanha };
}

describe('useTravadoFlow', () => {
  it('começa no passo escolha, sem estado selecionado', async () => {
    const { result } = await montar();
    expect(result.current.passo).toBe('escolha');
    expect(result.current.estadoSelecionado).toBeNull();
  });

  it('selecionarEstado avança pro passo resposta', async () => {
    const { result } = await montar();
    await act(async () => {
      result.current.selecionarEstado('confusao');
    });
    expect(result.current.passo).toBe('resposta');
    expect(result.current.estadoSelecionado).toBe('confusao');
  });

  it('voltar retorna ao passo escolha e limpa o estado selecionado', async () => {
    const { result } = await montar();
    await act(async () => {
      result.current.selecionarEstado('tedio');
    });
    await act(async () => {
      result.current.voltar();
    });
    expect(result.current.passo).toBe('escolha');
    expect(result.current.estadoSelecionado).toBeNull();
  });

  describe('confusao', () => {
    it('cria a subtarefa com tarefaPaiId e abre a sessão de 2 minutos', async () => {
      const { result, criarSubtarefa } = await montar();
      await act(async () => {
        result.current.selecionarEstado('confusao');
      });

      await act(async () => {
        result.current.iniciarConfusao('abrir o arquivo');
      });

      expect(criarSubtarefa).toHaveBeenCalledWith('abrir o arquivo', 'tarefa-1');
      expect(result.current.passo).toBe('sessao');
      expect(result.current.parametrosSessao).toEqual({
        tarefaId: 'subtarefa-1',
        estadoTravado: 'confusao',
        duracaoPlanejadaSeg: DURACAO_SEG_CONFUSAO,
      });
    });

    it('sem tarefa de contexto: cria subtarefa sem tarefaPaiId', async () => {
      const { result, criarSubtarefa } = await montar(null);
      await act(async () => {
        result.current.selecionarEstado('confusao');
      });

      await act(async () => {
        result.current.iniciarConfusao('separar o material');
      });

      expect(criarSubtarefa).toHaveBeenCalledWith('separar o material', undefined);
      expect(result.current.passo).toBe('sessao');
    });

    it('recusa da criação (teto atingido): não avança pro passo sessao', async () => {
      const { result, criarSubtarefa } = await montar();
      criarSubtarefa.mockReturnValue(null);
      await act(async () => {
        result.current.selecionarEstado('confusao');
      });

      await act(async () => {
        result.current.iniciarConfusao('mais uma');
      });

      expect(result.current.passo).toBe('resposta');
      expect(result.current.parametrosSessao).toBeNull();
    });
  });

  describe('medo/tedio', () => {
    it('medo: abre sessão de 5 minutos com a tarefa de contexto, sem criar subtarefa', async () => {
      const { result, criarSubtarefa } = await montar();
      await act(async () => {
        result.current.selecionarEstado('medo');
      });

      await act(async () => {
        result.current.iniciarMedoOuTedio();
      });

      expect(criarSubtarefa).not.toHaveBeenCalled();
      expect(result.current.passo).toBe('sessao');
      expect(result.current.parametrosSessao).toEqual({
        tarefaId: 'tarefa-1',
        estadoTravado: 'medo',
        duracaoPlanejadaSeg: DURACAO_SEG_MEDO,
      });
    });

    it('tedio: abre sessão de 5 minutos', async () => {
      const { result } = await montar();
      await act(async () => {
        result.current.selecionarEstado('tedio');
      });

      await act(async () => {
        result.current.iniciarMedoOuTedio();
      });

      expect(result.current.parametrosSessao).toEqual({
        tarefaId: 'tarefa-1',
        estadoTravado: 'tedio',
        duracaoPlanejadaSeg: DURACAO_SEG_TEDIO,
      });
    });

    it('sem tarefa de contexto: tarefaId da sessão fica null', async () => {
      const { result } = await montar(null);
      await act(async () => {
        result.current.selecionarEstado('medo');
      });

      await act(async () => {
        result.current.iniciarMedoOuTedio();
      });

      expect(result.current.parametrosSessao?.tarefaId).toBeNull();
    });
  });

  describe('energia', () => {
    it('temTarefaContexto reflete a presença da tarefa de contexto', async () => {
      const { result: com } = await montar();
      expect(com.current.temTarefaContexto).toBe(true);

      const { result: sem } = await montar(null);
      expect(sem.current.temTarefaContexto).toBe(false);
    });

    it('iniciarDescanso abre sessão de 10 minutos', async () => {
      const { result } = await montar();
      await act(async () => {
        result.current.selecionarEstado('energia');
      });

      await act(async () => {
        result.current.iniciarDescanso();
      });

      expect(result.current.parametrosSessao).toEqual({
        tarefaId: 'tarefa-1',
        estadoTravado: 'energia',
        duracaoPlanejadaSeg: DURACAO_SEG_DESCANSO_ENERGIA,
      });
    });

    it('salvarVersaoMenor edita o título da tarefa de contexto e encerra o fluxo', async () => {
      const { result, editarTarefa } = await montar();
      await act(async () => {
        result.current.selecionarEstado('energia');
      });

      await act(async () => {
        result.current.salvarVersaoMenor('Só o título');
      });

      expect(editarTarefa).toHaveBeenCalledWith('tarefa-1', {
        titulo: 'Só o título',
      });
      expect(result.current.passo).toBe('concluido');
    });

    it('salvarVersaoMenor sem tarefa de contexto: no-op', async () => {
      const { result, editarTarefa } = await montar(null);
      await act(async () => {
        result.current.selecionarEstado('energia');
      });

      await act(async () => {
        result.current.salvarVersaoMenor('Só o título');
      });

      expect(editarTarefa).not.toHaveBeenCalled();
      expect(result.current.passo).toBe('resposta');
    });

    it('moverParaAmanha move a tarefa de contexto (com quando) e encerra o fluxo', async () => {
      const { result, moverTarefaParaAmanha } = await montar();
      await act(async () => {
        result.current.selecionarEstado('energia');
      });

      await act(async () => {
        await result.current.moverParaAmanha('09:00');
      });

      expect(moverTarefaParaAmanha).toHaveBeenCalledWith(TAREFA_CONTEXTO, '09:00');
      expect(result.current.passo).toBe('concluido');
    });

    it('moverParaAmanha sem quando', async () => {
      const { result, moverTarefaParaAmanha } = await montar();
      await act(async () => {
        result.current.selecionarEstado('energia');
      });

      await act(async () => {
        await result.current.moverParaAmanha();
      });

      expect(moverTarefaParaAmanha).toHaveBeenCalledWith(TAREFA_CONTEXTO, undefined);
    });

    it('moverParaAmanha sem tarefa de contexto: no-op', async () => {
      const { result, moverTarefaParaAmanha } = await montar(null);
      await act(async () => {
        result.current.selecionarEstado('energia');
      });

      await act(async () => {
        await result.current.moverParaAmanha('09:00');
      });

      expect(moverTarefaParaAmanha).not.toHaveBeenCalled();
      expect(result.current.passo).toBe('resposta');
    });
  });
});
