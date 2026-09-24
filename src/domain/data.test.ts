import {
  dataDeAmanhaLocal,
  dataDeOntemLocal,
  dataLocalDeISO,
  diferencaEmDiasLocal,
  hojeISOLocal,
  paraISOLocal,
} from './data';

describe('paraISOLocal', () => {
  it('monta YYYY-MM-DD a partir dos componentes locais', () => {
    expect(paraISOLocal(new Date(2026, 8, 24, 12, 0, 0))).toBe('2026-09-24');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(paraISOLocal(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
  });

  it('CASO CRÍTICO: 22h local em GMT-3 continua sendo o dia corrente, não o seguinte', () => {
    // Em UTC, 2026-09-23T22:00 local (GMT-3) já é 2026-09-24T01:00 — uma
    // implementação baseada em toISOString() retornaria '2026-09-24' aqui,
    // errado. paraISOLocal precisa continuar dizendo '2026-09-23'.
    const as22hLocal = new Date(2026, 8, 23, 22, 0, 0);
    expect(paraISOLocal(as22hLocal)).toBe('2026-09-23');
    // Confirma que o teste é significativo (não passa por acidente): o
    // toISOString() dessa mesma data JÁ mostra o dia seguinte.
    expect(as22hLocal.toISOString().slice(0, 10)).toBe('2026-09-24');
  });

  it('meia-noite local (00:00) já conta como o novo dia', () => {
    expect(paraISOLocal(new Date(2026, 8, 24, 0, 0, 1))).toBe('2026-09-24');
  });

  it('virada de ano: 31/12 23h continua sendo o ano corrente', () => {
    const reveillon = new Date(2026, 11, 31, 23, 30, 0);
    expect(paraISOLocal(reveillon)).toBe('2026-12-31');
  });
});

describe('hojeISOLocal', () => {
  it('usa a data/hora atual do sistema (fuso America/Sao_Paulo, configurado no jest.config.js)', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 23, 22, 30, 0));
    expect(hojeISOLocal()).toBe('2026-09-23');
    jest.useRealTimers();
  });
});

describe('dataLocalDeISO', () => {
  it('reconstrói meia-noite local a partir da string', () => {
    const data = dataLocalDeISO('2026-09-24');
    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(8); // setembro = índice 8
    expect(data.getDate()).toBe(24);
    expect(data.getHours()).toBe(0);
  });
});

describe('dataDeOntemLocal', () => {
  it('aceita um Date e devolve o dia anterior local', () => {
    expect(dataDeOntemLocal(new Date(2026, 8, 24, 8, 0, 0))).toBe(
      '2026-09-23',
    );
  });

  it('aceita uma string YYYY-MM-DD e devolve o dia anterior', () => {
    expect(dataDeOntemLocal('2026-09-24')).toBe('2026-09-23');
  });

  it('vira o mês corretamente (1º do mês -> último dia do mês anterior)', () => {
    expect(dataDeOntemLocal('2026-10-01')).toBe('2026-09-30');
  });

  it('vira o ano corretamente (1º de janeiro -> 31 de dezembro do ano anterior)', () => {
    expect(dataDeOntemLocal('2026-01-01')).toBe('2025-12-31');
  });

  it('CASO CRÍTICO: às 22h local, "ontem" continua sendo o dia anterior ao corrente local', () => {
    const as22hLocal = new Date(2026, 8, 24, 22, 0, 0);
    expect(dataDeOntemLocal(as22hLocal)).toBe('2026-09-23');
  });
});

describe('dataDeAmanhaLocal', () => {
  it('aceita um Date e devolve o dia seguinte local', () => {
    expect(dataDeAmanhaLocal(new Date(2026, 8, 24, 8, 0, 0))).toBe(
      '2026-09-25',
    );
  });

  it('aceita uma string YYYY-MM-DD e devolve o dia seguinte', () => {
    expect(dataDeAmanhaLocal('2026-09-24')).toBe('2026-09-25');
  });

  it('vira o mês corretamente (último dia do mês -> 1º do mês seguinte)', () => {
    expect(dataDeAmanhaLocal('2026-09-30')).toBe('2026-10-01');
  });

  it('vira o ano corretamente (31 de dezembro -> 1º de janeiro do ano seguinte)', () => {
    expect(dataDeAmanhaLocal('2026-12-31')).toBe('2027-01-01');
  });

  it('CASO CRÍTICO: às 22h local, "amanhã" continua sendo o dia seguinte ao corrente local', () => {
    const as22hLocal = new Date(2026, 8, 24, 22, 0, 0);
    expect(dataDeAmanhaLocal(as22hLocal)).toBe('2026-09-25');
  });
});

describe('diferencaEmDiasLocal', () => {
  it('0 quando as duas datas são iguais', () => {
    expect(diferencaEmDiasLocal('2026-09-24', '2026-09-24')).toBe(0);
  });

  it('positivo quando b é posterior a a', () => {
    expect(diferencaEmDiasLocal('2026-09-23', '2026-09-24')).toBe(1);
    expect(diferencaEmDiasLocal('2026-09-20', '2026-09-24')).toBe(4);
  });

  it('negativo quando b é anterior a a', () => {
    expect(diferencaEmDiasLocal('2026-09-24', '2026-09-23')).toBe(-1);
  });

  it('atravessa virada de mês corretamente', () => {
    expect(diferencaEmDiasLocal('2026-09-30', '2026-10-01')).toBe(1);
  });

  it('atravessa virada de ano corretamente', () => {
    expect(diferencaEmDiasLocal('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('não é afetado por horário de verão inexistente (sem parse com sufixo Z)', () => {
    // Ambas as datas nascem via dataLocalDeISO (meia-noite local
    // reconstruída dos componentes, não aritmética de milissegundos sobre
    // um instante UTC) — o resultado tem que ser sempre um número inteiro
    // de dias, nunca 0.999... ou 1.000...1 por causa de deslocamento de
    // fuso entre as duas.
    expect(Number.isInteger(diferencaEmDiasLocal('2026-09-01', '2026-09-30'))).toBe(
      true,
    );
    expect(diferencaEmDiasLocal('2026-09-01', '2026-09-30')).toBe(29);
  });
});
