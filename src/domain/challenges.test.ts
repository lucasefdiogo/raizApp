import {
  calcularPeriodoMensal,
  calcularPeriodoSemanal,
  calcularProgressoDesafio,
  gerarCatalogoDoPeriodo,
} from './challenges';
import { DailyLogResumo } from './progress';
import { Desafio, Tarefa } from './types';

// 2026-09-07 é uma segunda-feira; 2026-09-13 domingo; 2026-09-14 segunda.
const D = (iso: string, hora = 'T12:00:00Z') => new Date(`${iso}${hora}`);

function dia(
  data: string,
  opts: { essencial?: boolean; escudo?: boolean; exercicios?: number } = {},
): DailyLogResumo {
  const tarefas: Tarefa[] = [];
  if (opts.essencial) {
    tarefas.push({ id: 'e', titulo: 't', essencial: true, concluida: true });
  }
  for (let i = 0; i < (opts.exercicios ?? 0); i += 1) {
    tarefas.push({
      id: `ex${i}`,
      titulo: 'x',
      essencial: false,
      concluida: true,
      tipo: 'exercicio',
    });
  }
  return { data, tarefas, escudoUsado: Boolean(opts.escudo) };
}

describe('calcularPeriodoSemanal', () => {
  it('no meio da semana: segunda a domingo', () => {
    expect(calcularPeriodoSemanal(D('2026-09-16'))).toEqual({
      inicio: '2026-09-14',
      fim: '2026-09-20',
    });
  });

  it('na própria segunda: início é o mesmo dia', () => {
    expect(calcularPeriodoSemanal(D('2026-09-14', 'T00:00:00Z')).inicio).toBe(
      '2026-09-14',
    );
  });

  it('no domingo: ainda pertence à semana que começou na segunda anterior', () => {
    expect(calcularPeriodoSemanal(D('2026-09-13', 'T23:00:00Z'))).toEqual({
      inicio: '2026-09-07',
      fim: '2026-09-13',
    });
  });

  it('atravessa a virada de mês', () => {
    // 2026-10-01 é quinta -> semana começa 2026-09-28
    expect(calcularPeriodoSemanal(D('2026-10-01'))).toEqual({
      inicio: '2026-09-28',
      fim: '2026-10-04',
    });
  });
});

describe('calcularPeriodoMensal', () => {
  it('dia 1 ao último dia do mês', () => {
    expect(calcularPeriodoMensal(D('2026-09-16'))).toEqual({
      inicio: '2026-09-01',
      fim: '2026-09-30',
    });
  });

  it('fevereiro não-bissexto termina no dia 28', () => {
    expect(calcularPeriodoMensal(D('2027-02-10')).fim).toBe('2027-02-28');
  });

  it('dezembro termina no dia 31', () => {
    expect(calcularPeriodoMensal(D('2026-12-20'))).toEqual({
      inicio: '2026-12-01',
      fim: '2026-12-31',
    });
  });
});

describe('gerarCatalogoDoPeriodo', () => {
  it('semana par: gera "Exercite-se 3x" (meta 3)', () => {
    const [desafio] = gerarCatalogoDoPeriodo(
      'semanal',
      '2026-09-07',
      '2026-09-13',
    );
    expect(desafio).toMatchObject({
      id: 'exercicio_3x-2026-09-07',
      tipo: 'exercicio_3x',
      titulo: 'Exercite-se 3x essa semana',
      periodo: 'semanal',
      dataInicio: '2026-09-07',
      dataFim: '2026-09-13',
      meta: 3,
      progresso: 0,
      status: 'ativo',
    });
  });

  it('semana ímpar: gera "Cumpra sua essencial todo dia" (meta 7)', () => {
    const [desafio] = gerarCatalogoDoPeriodo(
      'semanal',
      '2026-09-14',
      '2026-09-20',
    );
    expect(desafio).toMatchObject({
      tipo: 'essencial_todo_dia',
      titulo: 'Cumpra sua essencial todo dia',
      meta: 7,
    });
  });

  it('mensal: sempre "20 dias ativos" (meta 20)', () => {
    const [desafio] = gerarCatalogoDoPeriodo(
      'mensal',
      '2026-09-01',
      '2026-09-30',
    );
    expect(desafio).toMatchObject({
      tipo: 'dias_ativos_20',
      periodo: 'mensal',
      meta: 20,
      id: 'dias_ativos_20-2026-09-01',
    });
  });

  it('retorna sempre 1 item', () => {
    expect(
      gerarCatalogoDoPeriodo('semanal', '2026-09-07', '2026-09-13'),
    ).toHaveLength(1);
  });
});

describe('calcularProgressoDesafio', () => {
  const semanalExercicio: Desafio = {
    id: 'exercicio_3x-2026-09-07',
    titulo: 'Exercite-se 3x essa semana',
    tipo: 'exercicio_3x',
    periodo: 'semanal',
    dataInicio: '2026-09-07',
    dataFim: '2026-09-13',
    meta: 3,
    progresso: 0,
    status: 'ativo',
  };
  const semanalEssencial: Desafio = {
    ...semanalExercicio,
    id: 'essencial_todo_dia-2026-09-07',
    tipo: 'essencial_todo_dia',
    titulo: 'Cumpra sua essencial todo dia',
    meta: 7,
  };
  const mensal: Desafio = {
    id: 'dias_ativos_20-2026-09-01',
    titulo: '20 dias ativos esse mês',
    tipo: 'dias_ativos_20',
    periodo: 'mensal',
    dataInicio: '2026-09-01',
    dataFim: '2026-09-30',
    meta: 20,
    progresso: 0,
    status: 'ativo',
  };

  describe('exercicio_3x', () => {
    it('ativo: conta exercícios concluídos, abaixo da meta', () => {
      const logs = [
        dia('2026-09-08', { exercicios: 1 }),
        dia('2026-09-10', { exercicios: 1 }),
      ];
      const r = calcularProgressoDesafio(semanalExercicio, logs, D('2026-09-11'));
      expect(r.progresso).toBe(2);
      expect(r.status).toBe('ativo');
    });

    it('concluído: bateu a meta (progresso limitado à meta)', () => {
      const logs = [dia('2026-09-08', { exercicios: 5 })];
      const r = calcularProgressoDesafio(semanalExercicio, logs, D('2026-09-09'));
      expect(r.progresso).toBe(3);
      expect(r.status).toBe('concluido');
    });

    it('expirado: período acabou sem bater a meta', () => {
      const logs = [dia('2026-09-08', { exercicios: 1 })];
      const r = calcularProgressoDesafio(semanalExercicio, logs, D('2026-09-15'));
      expect(r.progresso).toBe(1);
      expect(r.status).toBe('expirado');
    });

    it('não conta exercício não concluído nem tarefa comum', () => {
      const logs: DailyLogResumo[] = [
        {
          data: '2026-09-08',
          escudoUsado: false,
          tarefas: [
            { id: 'a', titulo: 'x', essencial: false, concluida: false, tipo: 'exercicio' },
            { id: 'b', titulo: 'y', essencial: false, concluida: true },
          ],
        },
      ];
      const r = calcularProgressoDesafio(semanalExercicio, logs, D('2026-09-09'));
      expect(r.progresso).toBe(0);
    });
  });

  describe('essencial_todo_dia', () => {
    it('ativo: conta dias cumpridos (essencial ou escudo), abaixo da meta', () => {
      const logs = [
        dia('2026-09-07', { essencial: true }),
        dia('2026-09-08', { escudo: true }),
        dia('2026-09-09', { essencial: true }),
      ];
      const r = calcularProgressoDesafio(semanalEssencial, logs, D('2026-09-10'));
      expect(r.progresso).toBe(3);
      expect(r.status).toBe('ativo');
    });

    it('conta o dia de hoje ao vivo quando já tem essencial concluída', () => {
      const logs = [
        dia('2026-09-07', { essencial: true }),
        dia('2026-09-08', { essencial: true }),
      ];
      // hoje = 2026-09-08, dentro do período; o log de hoje conta
      const r = calcularProgressoDesafio(semanalEssencial, logs, D('2026-09-08'));
      expect(r.progresso).toBe(2);
    });

    it('concluído: 7 dias cumpridos', () => {
      const logs = [
        '2026-09-07',
        '2026-09-08',
        '2026-09-09',
        '2026-09-10',
        '2026-09-11',
        '2026-09-12',
        '2026-09-13',
      ].map(d => dia(d, { essencial: true }));
      const r = calcularProgressoDesafio(semanalEssencial, logs, D('2026-09-14'));
      expect(r.progresso).toBe(7);
      expect(r.status).toBe('concluido');
    });

    it('expirado: período acabou com menos de 7', () => {
      const logs = [
        dia('2026-09-07', { essencial: true }),
        dia('2026-09-08', { essencial: true }),
      ];
      const r = calcularProgressoDesafio(semanalEssencial, logs, D('2026-09-14'));
      expect(r.progresso).toBe(2);
      expect(r.status).toBe('expirado');
    });

    it('dia perdido (log sem essencial e sem escudo) não conta', () => {
      const logs = [
        dia('2026-09-07', { essencial: true }),
        { data: '2026-09-08', tarefas: [], escudoUsado: false },
      ];
      const r = calcularProgressoDesafio(semanalEssencial, logs, D('2026-09-10'));
      expect(r.progresso).toBe(1);
    });
  });

  describe('dias_ativos_20', () => {
    function diasSeq(inicioDia: number, quantos: number): DailyLogResumo[] {
      return Array.from({ length: quantos }, (_, i) =>
        dia(
          `2026-09-${String(inicioDia + i).padStart(2, '0')}`,
          { essencial: true },
        ),
      );
    }

    it('ativo: menos de 20 dias ativos no mês', () => {
      const r = calcularProgressoDesafio(mensal, diasSeq(1, 8), D('2026-09-16'));
      expect(r.progresso).toBe(8);
      expect(r.status).toBe('ativo');
    });

    it('concluído: 20 dias ativos', () => {
      const r = calcularProgressoDesafio(mensal, diasSeq(1, 22), D('2026-09-25'));
      expect(r.progresso).toBe(20);
      expect(r.status).toBe('concluido');
    });

    it('expirado: mês acabou com menos de 20', () => {
      const r = calcularProgressoDesafio(mensal, diasSeq(1, 15), D('2026-10-02'));
      expect(r.progresso).toBe(15);
      expect(r.status).toBe('expirado');
    });
  });
});
