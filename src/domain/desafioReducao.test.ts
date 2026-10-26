import {
  calcularBaseSegundos,
  atingeMinimoParaProposta,
  calcularMetaSegundos,
  montarProposta,
} from './desafioReducao';

const APPS = ['com.instagram.android'];

function logComUso(data: string, segundos: number) {
  return { data, usoApps: { 'com.instagram.android': { segundos, aberturas: 1 } } };
}

describe('calcularBaseSegundos', () => {
  it('com 7 dias de dado, a base é o total da semana', () => {
    const logs = Array.from({ length: 7 }, (_, i) => logComUso(`2026-10-0${i + 1}`, 3600));
    expect(calcularBaseSegundos(logs, APPS)).toBe(7 * 3600);
  });

  it('com 4 a 6 dias de dado, a base é a média dos dias com dado × 7', () => {
    const logs = [
      logComUso('2026-10-01', 3600),
      logComUso('2026-10-02', 3600),
      logComUso('2026-10-03', 3600),
      logComUso('2026-10-04', 3600),
    ];
    expect(calcularBaseSegundos(logs, APPS)).toBe(Math.round((4 * 3600 / 4) * 7));
  });

  it('dia sem usoApps não conta como zero na média', () => {
    const logs = [
      logComUso('2026-10-01', 7200),
      logComUso('2026-10-02', 7200),
      logComUso('2026-10-03', 7200),
      logComUso('2026-10-04', 7200),
      { data: '2026-10-05' },
    ];
    // 4 dias com dado, não 5 — média continua 7200, não 5760.
    expect(calcularBaseSegundos(logs, APPS)).toBe(Math.round((4 * 7200 / 4) * 7));
  });
});

describe('atingeMinimoParaProposta', () => {
  it('abaixo de 1h não atinge', () => expect(atingeMinimoParaProposta(3599)).toBe(false));
  it('exatamente 1h atinge (limite inclusivo)', () => expect(atingeMinimoParaProposta(3600)).toBe(true));
  it('acima de 1h atinge', () => expect(atingeMinimoParaProposta(7200)).toBe(true));
});

describe('calcularMetaSegundos', () => {
  it('base 6h 20min (22800s) vira meta 5h 40min (20400s) — ×0,9 arredondado pra baixo ao múltiplo de 5min', () => {
    expect(calcularMetaSegundos(22800)).toBe(20400);
  });
  it('não sofre erro de ponto flutuante quando ×0,9 cai exatamente num múltiplo de 5min', () => {
    expect(calcularMetaSegundos(20000)).toBe(18000);
  });
});

describe('montarProposta', () => {
  it('monta título e linha de comparação a partir da base', () => {
    const proposta = montarProposta(22800); // 6h20min -> meta 5h40min, delta 40min
    expect(proposta).toEqual({
      titulo: 'Até 5h 40min nas redes',
      linha: 'Cerca de 40 min a menos que a semana passada. Pequeno de propósito.',
      metaSegundos: 20400,
      baseSegundos: 22800,
    });
  });
});
