import { construirHistoricoSemana } from './progress';
import { Tarefa } from './types';

function tarefaEssencialConcluida(): Tarefa {
  return { id: '1', titulo: 'tarefa', essencial: true, concluida: true };
}

function tarefaNaoConcluida(): Tarefa {
  return { id: '1', titulo: 'tarefa', essencial: true, concluida: false };
}

const HOJE = new Date('2026-09-14T12:00:00Z'); // segunda-feira

describe('construirHistoricoSemana', () => {
  it('devolve 7 dias, do mais antigo pro mais recente, terminando em hoje', () => {
    const historico = construirHistoricoSemana([], HOJE);

    expect(historico).toHaveLength(7);
    expect(historico[0].data).toBe('2026-09-08');
    expect(historico[6].data).toBe('2026-09-14');
  });

  it('todos os dias cumpridos (exceto hoje, sempre pendente)', () => {
    const dailyLogs = [
      { data: '2026-09-08', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      { data: '2026-09-09', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      { data: '2026-09-10', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      { data: '2026-09-11', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      { data: '2026-09-12', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      { data: '2026-09-13', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      // hoje (2026-09-14) sem log — mesmo assim deve virar 'pendente', não 'sem_registro'
    ];

    const historico = construirHistoricoSemana(dailyLogs, HOJE);

    expect(historico.slice(0, 6).every(dia => dia.status === 'cumprido')).toBe(true);
    expect(historico[6]).toEqual({ data: '2026-09-14', status: 'pendente' });
  });

  it('mistura os 4 status reais (cumprido, protegido_escudo, perdido, pendente)', () => {
    const dailyLogs = [
      { data: '2026-09-09', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      { data: '2026-09-10', tarefas: [tarefaNaoConcluida()], escudoUsado: true },
      { data: '2026-09-11', tarefas: [tarefaNaoConcluida()], escudoUsado: false },
    ];

    const historico = construirHistoricoSemana(dailyLogs, HOJE);
    const porData = new Map(historico.map(dia => [dia.data, dia.status]));

    expect(porData.get('2026-09-09')).toBe('cumprido');
    expect(porData.get('2026-09-10')).toBe('protegido_escudo');
    expect(porData.get('2026-09-11')).toBe('perdido');
    expect(porData.get('2026-09-14')).toBe('pendente');
  });

  it('dias sem dailyLog no meio do período viram sem_registro', () => {
    const dailyLogs = [
      { data: '2026-09-08', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
      // 09, 10, 11, 12, 13 sem log nenhum
    ];

    const historico = construirHistoricoSemana(dailyLogs, HOJE);
    const porData = new Map(historico.map(dia => [dia.data, dia.status]));

    expect(porData.get('2026-09-08')).toBe('cumprido');
    expect(porData.get('2026-09-09')).toBe('sem_registro');
    expect(porData.get('2026-09-10')).toBe('sem_registro');
    expect(porData.get('2026-09-11')).toBe('sem_registro');
    expect(porData.get('2026-09-12')).toBe('sem_registro');
    expect(porData.get('2026-09-13')).toBe('sem_registro');
  });

  it('hoje é sempre pendente, mesmo com um dailyLog já cumprido registrado pra hoje', () => {
    const dailyLogs = [
      { data: '2026-09-14', tarefas: [tarefaEssencialConcluida()], escudoUsado: false },
    ];

    const historico = construirHistoricoSemana(dailyLogs, HOJE);

    expect(historico[6]).toEqual({ data: '2026-09-14', status: 'pendente' });
  });
});
