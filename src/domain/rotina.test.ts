import {
  estimarRotina,
  dentroDaJanelaNoturna,
  horarioPausaMaior,
  horariosRotinaValidos,
  resumoRotina,
  DiaRotina,
} from './rotina';
import { Rotina } from './types';

function dia(primeiro: string, ultimo: string): DiaRotina {
  return { primeiroUsoDia: primeiro, ultimoUsoAntesPausaLonga: ultimo };
}

describe('estimarRotina', () => {
  it('CA-01: 5 dias com os dois campos estimam dormir e acordar pela mediana', () => {
    const dias = [
      dia('2026-10-10T07:00:00', '2026-10-10T23:30:00'),
      dia('2026-10-11T07:10:00', '2026-10-11T23:00:00'),
      dia('2026-10-12T06:50:00', '2026-10-12T23:45:00'),
      dia('2026-10-13T08:00:00', '2026-10-13T22:00:00'),
      dia('2026-10-14T07:20:00', '2026-10-14T23:15:00'),
    ];
    expect(estimarRotina(dias, false)).toEqual({
      dormirEstimado: '23:15',
      acordarEstimado: '07:10',
    });
  });

  it('CA-01: horários de dormir após a meia-noite não quebram a mediana na virada', () => {
    const dias = [
      dia('2026-10-10T07:00:00', '2026-10-11T00:30:00'),
      dia('2026-10-11T07:00:00', '2026-10-11T23:50:00'),
      dia('2026-10-12T07:00:00', '2026-10-13T00:10:00'),
      dia('2026-10-13T07:00:00', '2026-10-13T23:40:00'),
      dia('2026-10-14T07:00:00', '2026-10-15T01:00:00'),
    ];
    // Medianas em 24h+: 23:40, 23:50, 24:30, 24:10, 25:00 -> 24:10 = 00:10
    expect(estimarRotina(dias, false)).toEqual({
      dormirEstimado: '00:10',
      acordarEstimado: '07:00',
    });
  });

  it('CA-07: com menos de 5 dias com os dois campos não estima', () => {
    const dias = [
      dia('2026-10-10T07:00:00', '2026-10-10T23:30:00'),
      dia('2026-10-11T07:10:00', '2026-10-11T23:00:00'),
      dia('2026-10-12T06:50:00', '2026-10-12T23:45:00'),
      dia('2026-10-13T08:00:00', '2026-10-13T22:00:00'),
      { primeiroUsoDia: '2026-10-14T07:20:00' },
      { ultimoUsoAntesPausaLonga: '2026-10-15T23:00:00' },
    ];
    expect(estimarRotina(dias, false)).toBeNull();
  });

  it('CA-08: com modoManual verdadeiro a estimativa automática não roda', () => {
    const dias = Array.from({ length: 6 }, (_, i) =>
      dia(`2026-10-1${i}T07:00:00`, `2026-10-1${i}T23:00:00`),
    );
    expect(estimarRotina(dias, true)).toBeNull();
  });
});

describe('dentroDaJanelaNoturna', () => {
  const rotina = (dormir: string, acordar: string, confirmadoEm?: string) => ({
    dormirEstimado: dormir,
    acordarEstimado: acordar,
    confirmadoEm,
  });
  const confirmada = rotina('23:00', '07:00', '2026-10-15');
  const as = (h: number, m: number) => new Date(2026, 9, 20, h, m, 0);

  it('CA-04: dentro da janela, de 30 min antes de dormir até acordar, devolve verdadeiro', () => {
    expect(dentroDaJanelaNoturna(confirmada, as(23, 30))).toBe(true);
    expect(dentroDaJanelaNoturna(confirmada, as(3, 0))).toBe(true);
    expect(dentroDaJanelaNoturna(confirmada, as(6, 59))).toBe(true);
  });

  it('CA-04: o início da janela (30 min antes de dormir) é inclusivo e o acordar é exclusivo', () => {
    expect(dentroDaJanelaNoturna(confirmada, as(22, 29))).toBe(false);
    expect(dentroDaJanelaNoturna(confirmada, as(22, 30))).toBe(true);
    expect(dentroDaJanelaNoturna(confirmada, as(7, 0))).toBe(false);
  });

  it('CA-04: dormir pós-meia-noite começa a janela 30 min antes, inclusive no dia anterior', () => {
    const r = rotina('00:10', '08:00', '2026-10-15');
    expect(dentroDaJanelaNoturna(r, as(23, 39))).toBe(false);
    expect(dentroDaJanelaNoturna(r, as(23, 40))).toBe(true);
    expect(dentroDaJanelaNoturna(r, as(0, 5))).toBe(true);
    expect(dentroDaJanelaNoturna(r, as(8, 0))).toBe(false);
    const r2 = rotina('00:30', '08:00', '2026-10-15');
    expect(dentroDaJanelaNoturna(r2, as(23, 59))).toBe(false);
    expect(dentroDaJanelaNoturna(r2, as(0, 0))).toBe(true);
    expect(dentroDaJanelaNoturna(r2, as(7, 59))).toBe(true);
  });

  it('CA-06: sem confirmadoEm a janela noturna não se aplica, mesmo às 23h', () => {
    expect(dentroDaJanelaNoturna(rotina('23:00', '07:00'), as(23, 0))).toBe(
      false,
    );
    expect(dentroDaJanelaNoturna(null, as(23, 0))).toBe(false);
    expect(dentroDaJanelaNoturna(undefined, as(23, 0))).toBe(false);
  });

  it('CA-06: fora da janela, com rotina confirmada, devolve falso', () => {
    expect(dentroDaJanelaNoturna(confirmada, as(12, 0))).toBe(false);
    expect(dentroDaJanelaNoturna(confirmada, as(22, 0))).toBe(false);
  });
});

describe('horarioPausaMaior', () => {
  it('HU-09 Cenário 8: 30 min antes de dormirEstimado', () => {
    expect(horarioPausaMaior('23:30')).toBe('23:00');
  });

  it('HU-09 RN07: dormir pós-meia-noite cruza pro dia anterior', () => {
    expect(horarioPausaMaior('00:10')).toBe('23:40');
  });
});

describe('horariosRotinaValidos', () => {
  it('HU-10 RN08: dormir e acordar diferentes são válidos', () => {
    expect(horariosRotinaValidos('23:00', '07:00')).toBe(true);
  });

  it('HU-10 Cenário 7: dormir e acordar iguais são inválidos', () => {
    expect(horariosRotinaValidos('07:00', '07:00')).toBe(false);
  });
});

describe('resumoRotina', () => {
  const confirmada: Rotina = {
    dormirEstimado: '23:30',
    acordarEstimado: '07:00',
    confirmadoEm: '2026-10-15',
  };

  it('HU-09 Cenário 8: rotina confirmada, forma longa (Bloqueio)', () => {
    expect(resumoRotina(confirmada, 14, true, 'longa')).toBe(
      'Dormir 23:30 · Acordar 07:00',
    );
  });

  it('HU-09 Cenário 16: rotina confirmada, forma curta (Perfil)', () => {
    expect(resumoRotina(confirmada, 14, true, 'curta')).toBe('23:30 – 07:00');
  });

  it('HU-09 Cenário 17: sem acesso de uso tem prioridade sobre o resto', () => {
    expect(resumoRotina(null, 0, false, 'longa')).toBe(
      'Precisa medir o tempo nas redes',
    );
    expect(resumoRotina(null, 0, false, 'curta')).toBe(
      'Precisa medir o tempo nas redes',
    );
  });

  it('HU-09 Cenário 7: com acesso de uso e menos de 5 dias, mostra o progresso', () => {
    expect(resumoRotina(null, 3, true, 'longa')).toBe(
      'Aprendendo seu horário · 3 de 5 dias',
    );
  });

  it('HU-09 RN11: com 5 dias ou mais e sem confirmação, pronta para confirmar', () => {
    expect(resumoRotina(null, 5, true, 'longa')).toBe('Pronta para confirmar');
    expect(resumoRotina(null, 8, true, 'curta')).toBe('Pronta para confirmar');
  });

  it('HU-09 RN11: rotina confirmada tem prioridade mesmo sem acesso de uso', () => {
    expect(resumoRotina(confirmada, 0, false, 'longa')).toBe(
      'Dormir 23:30 · Acordar 07:00',
    );
  });
});
