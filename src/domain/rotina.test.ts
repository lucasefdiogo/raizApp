import { estimarRotina, dentroDaJanelaNoturna, DiaRotina } from './rotina';

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
