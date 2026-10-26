import { Tarefa } from './types';
import { calcularTipoAlternativa, escolherTarefaAlternativa, truncarTitulo } from './alternativaDia';

const essencialPendente = (id: string): Tarefa => ({
  id,
  titulo: id,
  essencial: true,
  concluida: false,
});
const comumPendente = (id: string): Tarefa => ({
  id,
  titulo: id,
  essencial: false,
  concluida: false,
});

describe('escolherTarefaAlternativa', () => {
  it('prioriza essenciais pendentes sobre comuns', () => {
    const tarefas = [comumPendente('c1'), essencialPendente('e1')];
    expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('e1');
  });

  it('sem essencial pendente, usa as comuns pendentes (subtarefa incluída)', () => {
    const tarefas: Tarefa[] = [
      { id: 'e1', titulo: 'E', essencial: true, concluida: true },
      comumPendente('c1'),
      { id: 's1', titulo: 'S', essencial: false, concluida: false, tarefaPaiId: 'e1' },
    ];
    expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('c1');
  });

  it('ignora concluídas nos dois grupos', () => {
    const tarefas: Tarefa[] = [
      { id: 'e1', titulo: 'E', essencial: true, concluida: true },
      { id: 'c1', titulo: 'C', essencial: false, concluida: true },
    ];
    expect(escolherTarefaAlternativa(tarefas, 1)).toBeNull();
  });

  it('lista vazia devolve null', () => {
    expect(escolherTarefaAlternativa([], 1)).toBeNull();
  });

  it('rotaciona pela posição da sessão dentro do grupo', () => {
    const tarefas = [essencialPendente('e1'), essencialPendente('e2'), essencialPendente('e3')];
    expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('e1');
    expect(escolherTarefaAlternativa(tarefas, 2)?.id).toBe('e2');
    expect(escolherTarefaAlternativa(tarefas, 4)?.id).toBe('e1'); // (4-1) % 3 === 0
  });

  it('grupo de tamanho 1 sempre devolve a mesma tarefa, qualquer posição', () => {
    const tarefas = [essencialPendente('e1')];
    expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('e1');
    expect(escolherTarefaAlternativa(tarefas, 7)?.id).toBe('e1');
  });
});

describe('truncarTitulo', () => {
  it('título de até 32 caracteres não é cortado', () => {
    const titulo = 'a'.repeat(32);
    expect(truncarTitulo(titulo)).toBe(titulo);
  });

  it('corta no último espaço antes do limite, com "…"', () => {
    const titulo = 'Escrever uma frase sobre o dia de hoje';
    expect(truncarTitulo(titulo)).toBe('Escrever uma frase sobre o dia…');
  });

  it('sem espaço antes do limite, corta em 32 caracteres com "…"', () => {
    const titulo = 'a'.repeat(40);
    expect(truncarTitulo(titulo)).toBe('a'.repeat(32) + '…');
  });
});

describe('calcularTipoAlternativa', () => {
  const TAREFA_ESSENCIAL: Tarefa = { id: 'e1', titulo: 'E', essencial: true, concluida: false };
  const TAREFA_COMUM: Tarefa = { id: 'c1', titulo: 'C', essencial: false, concluida: false };

  it('janela noturna com alternativa cadastrada: noturna, ignora a tarefa', () => {
    expect(calcularTipoAlternativa(true, 'Ler um pouco', TAREFA_ESSENCIAL)).toBe('noturna');
  });

  it('janela noturna sem alternativa cadastrada: nenhuma, mesmo com tarefa pendente', () => {
    expect(calcularTipoAlternativa(true, null, TAREFA_ESSENCIAL)).toBe('nenhuma');
  });

  it('fora da janela, tarefa essencial', () => {
    expect(calcularTipoAlternativa(false, null, TAREFA_ESSENCIAL)).toBe('tarefa_essencial');
  });

  it('fora da janela, tarefa comum', () => {
    expect(calcularTipoAlternativa(false, null, TAREFA_COMUM)).toBe('tarefa_comum');
  });

  it('fora da janela, sem tarefa: nenhuma', () => {
    expect(calcularTipoAlternativa(false, null, null)).toBe('nenhuma');
  });
});
