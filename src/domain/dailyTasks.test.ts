import {
  adicionarTarefa,
  contarEssenciais,
  editarTarefa,
  limiteEssenciaisAtingido,
  removerTarefa,
  tituloTarefaValido,
  MENSAGEM_LIMITE_ESSENCIAIS,
  MENSAGEM_TITULO_VAZIO,
} from './dailyTasks';
import { Tarefa } from './types';

function tarefa(overrides: Partial<Tarefa> = {}): Tarefa {
  return {
    id: overrides.id ?? '1',
    titulo: overrides.titulo ?? 'tarefa',
    essencial: overrides.essencial ?? false,
    concluida: overrides.concluida ?? false,
  };
}

const tresEssenciais: Tarefa[] = [
  tarefa({ id: '1', essencial: true }),
  tarefa({ id: '2', essencial: true }),
  tarefa({ id: '3', essencial: true }),
];

describe('contarEssenciais / limiteEssenciaisAtingido', () => {
  it('conta só as essenciais', () => {
    expect(
      contarEssenciais([
        tarefa({ id: '1', essencial: true }),
        tarefa({ id: '2', essencial: false }),
        tarefa({ id: '3', essencial: true }),
      ]),
    ).toBe(2);
  });

  it('limite atingido com 3 essenciais, não com 2', () => {
    expect(limiteEssenciaisAtingido(tresEssenciais)).toBe(true);
    expect(limiteEssenciaisAtingido(tresEssenciais.slice(0, 2))).toBe(false);
  });
});

describe('tituloTarefaValido', () => {
  it('rejeita string vazia ou só espaços', () => {
    expect(tituloTarefaValido('')).toBe(false);
    expect(tituloTarefaValido('   ')).toBe(false);
  });

  it('aceita título com conteúdo', () => {
    expect(tituloTarefaValido('  revisar capítulo 3 ')).toBe(true);
  });
});

describe('adicionarTarefa', () => {
  it('adiciona uma tarefa comum e preserva as existentes', () => {
    const resultado = adicionarTarefa(
      [tarefa({ id: '1' })],
      tarefa({ id: '2', titulo: 'nova' }),
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarefas).toHaveLength(2);
      expect(resultado.tarefas[1].titulo).toBe('nova');
    }
  });

  it('faz trim do título ao adicionar', () => {
    const resultado = adicionarTarefa([], tarefa({ titulo: '  beber água  ' }));
    expect(resultado.ok && resultado.tarefas[0].titulo).toBe('beber água');
  });

  it('recusa título vazio sem alterar a lista', () => {
    const original = [tarefa({ id: '1' })];
    const resultado = adicionarTarefa(original, tarefa({ id: '2', titulo: '  ' }));

    expect(resultado).toEqual({ ok: false, erro: MENSAGEM_TITULO_VAZIO });
  });

  it('deixa adicionar tarefa comum mesmo com 3 essenciais já no dia', () => {
    const resultado = adicionarTarefa(
      tresEssenciais,
      tarefa({ id: '4', titulo: 'comum', essencial: false }),
    );
    expect(resultado.ok).toBe(true);
  });

  it('recusa nova essencial quando o teto de 3 já foi atingido', () => {
    const resultado = adicionarTarefa(
      tresEssenciais,
      tarefa({ id: '4', titulo: 'quarta', essencial: true }),
    );
    expect(resultado).toEqual({ ok: false, erro: MENSAGEM_LIMITE_ESSENCIAIS });
  });
});

describe('removerTarefa', () => {
  it('tira a tarefa pelo id e mantém o resto na ordem', () => {
    const lista = [
      tarefa({ id: '1', titulo: 'a' }),
      tarefa({ id: '2', titulo: 'b' }),
      tarefa({ id: '3', titulo: 'c' }),
    ];
    expect(removerTarefa(lista, '2').map(t => t.id)).toEqual(['1', '3']);
  });

  it('id inexistente: devolve a lista igual', () => {
    const lista = [tarefa({ id: '1' })];
    expect(removerTarefa(lista, 'nao-existe')).toEqual(lista);
  });

  it('remover a última deixa a lista vazia', () => {
    expect(removerTarefa([tarefa({ id: '1' })], '1')).toEqual([]);
  });

  it('remover uma essencial não esbarra em nenhuma regra, mesmo no teto', () => {
    expect(contarEssenciais(removerTarefa(tresEssenciais, '1'))).toBe(2);
  });
});

describe('editarTarefa', () => {
  it('renomeia a tarefa alvo e faz trim', () => {
    const resultado = editarTarefa([tarefa({ id: '1', titulo: 'antigo' })], '1', {
      titulo: '  novo  ',
    });
    expect(resultado.ok && resultado.tarefas[0].titulo).toBe('novo');
  });

  it('id inexistente: devolve a lista inalterada', () => {
    const original = [tarefa({ id: '1' })];
    const resultado = editarTarefa(original, 'nao-existe', { titulo: 'x' });
    expect(resultado).toEqual({ ok: true, tarefas: original });
  });

  it('recusa renomear para título vazio', () => {
    const resultado = editarTarefa([tarefa({ id: '1' })], '1', { titulo: '   ' });
    expect(resultado).toEqual({ ok: false, erro: MENSAGEM_TITULO_VAZIO });
  });

  it('promove a essencial quando há espaço no teto', () => {
    const lista = [
      tarefa({ id: '1', essencial: true }),
      tarefa({ id: '2', essencial: false }),
    ];
    const resultado = editarTarefa(lista, '2', { essencial: true });
    expect(resultado.ok && resultado.tarefas[1].essencial).toBe(true);
  });

  it('recusa promover a essencial com o teto de 3 atingido', () => {
    const lista = [...tresEssenciais, tarefa({ id: '4', essencial: false })];
    const resultado = editarTarefa(lista, '4', { essencial: true });
    expect(resultado).toEqual({ ok: false, erro: MENSAGEM_LIMITE_ESSENCIAIS });
  });

  it('rebaixar essencial -> comum é sempre permitido, mesmo no teto', () => {
    const resultado = editarTarefa(tresEssenciais, '3', { essencial: false });
    expect(resultado.ok && contarEssenciais(resultado.tarefas)).toBe(2);
  });
});
