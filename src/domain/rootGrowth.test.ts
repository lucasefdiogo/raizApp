import { calcularAlturaCaule } from './rootGrowth';

describe('calcularAlturaCaule', () => {
  it('dia 0 (nenhuma sequência): altura mínima, igual ao caule do broto', () => {
    expect(calcularAlturaCaule(0)).toBeCloseTo(24, 1);
  });

  it('dia 1: crescimento perceptível logo de cara', () => {
    expect(calcularAlturaCaule(1)).toBeCloseTo(33.8, 1);
  });

  it('dia 30: bem mais alto que o dia 1, mas já achatando', () => {
    expect(calcularAlturaCaule(30)).toBeCloseTo(72.7, 1);
  });

  it('dia 90 (último marco): atinge o teto', () => {
    expect(calcularAlturaCaule(90)).toBeCloseTo(88, 1);
  });

  it('além de 90 dias: estabiliza no teto, não continua crescendo', () => {
    expect(calcularAlturaCaule(120)).toBeCloseTo(88, 1);
    expect(calcularAlturaCaule(365)).toBeCloseTo(88, 1);
    expect(calcularAlturaCaule(365)).toBe(calcularAlturaCaule(90));
  });

  it('dias negativos: tratados como 0, sem quebrar', () => {
    expect(calcularAlturaCaule(-5)).toBeCloseTo(24, 1);
  });

  it('propriedade logarítmica: o incremento do dia N+1 é sempre menor que o incremento do dia N (até o teto)', () => {
    let incrementoAnterior = Infinity;
    for (let dia = 1; dia <= 90; dia += 1) {
      const incremento = calcularAlturaCaule(dia) - calcularAlturaCaule(dia - 1);
      expect(incremento).toBeLessThan(incrementoAnterior);
      incrementoAnterior = incremento;
    }
  });

  it('nunca ultrapassa a altura máxima nem fica abaixo da mínima', () => {
    for (let dia = 0; dia <= 200; dia += 1) {
      const altura = calcularAlturaCaule(dia);
      expect(altura).toBeGreaterThanOrEqual(24);
      expect(altura).toBeLessThanOrEqual(88 + 0.001);
    }
  });
});
