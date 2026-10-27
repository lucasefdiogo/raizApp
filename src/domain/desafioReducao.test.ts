import {
  calcularBaseSegundos,
  atingeMinimoParaProposta,
  calcularMetaSegundos,
  montarProposta,
  calcularProgressoReducao,
  statusAoFechar,
  diasRestantes,
  textoDiasRestantes,
  textoResultadoAnterior,
} from './desafioReducao';
import { Desafio } from './types';

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
      { data: '2026-10-05', usoApps: undefined },
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
  it('não arredonda base×0,9 pra cima antes do floor (base 4333s: 0,9× = 3899,7, floor de 300 é 3600, não 3900)', () => {
    expect(calcularMetaSegundos(4333)).toBe(3600);
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

const DESAFIO_ATIVO: Desafio = {
  id: 'reducao_tempo_redes-2026-10-19',
  titulo: 'Até 5h 40min nas redes esta semana',
  tipo: 'reducao_tempo_redes',
  periodo: 'semanal',
  dataInicio: '2026-10-19',
  dataFim: '2026-10-25',
  meta: 20400,
  progresso: 0,
  status: 'ativo',
  baseSegundos: 22800,
};

describe('calcularProgressoReducao', () => {
  it('soma os segundos da semana filtrados pelos apps bloqueados', () => {
    const logs = [
      logComUso('2026-10-19', 3600),
      logComUso('2026-10-20', 1800),
    ];
    const resultado = calcularProgressoReducao(DESAFIO_ATIVO, logs, APPS, true);
    expect(resultado).toEqual({ progressoSegundos: 5400, ultrapassou: false, semMedicaoDesde: null });
  });

  it('marca ultrapassou quando o progresso já passa da meta, sem travar em 100%', () => {
    const logs = [logComUso('2026-10-19', 25000)];
    const resultado = calcularProgressoReducao(DESAFIO_ATIVO, logs, APPS, true);
    expect(resultado.progressoSegundos).toBe(25000);
    expect(resultado.ultrapassou).toBe(true);
  });

  it('progresso igual à meta não conta como ultrapassou', () => {
    const logs = [logComUso('2026-10-19', 20400)];
    const resultado = calcularProgressoReducao(DESAFIO_ATIVO, logs, APPS, true);
    expect(resultado.ultrapassou).toBe(false);
  });

  it('sem acesso de uso, o progresso congela no último valor gravado e aponta o último dia medido', () => {
    const logs = [
      logComUso('2026-10-19', 3600),
      { data: '2026-10-20' },
    ];
    const desafioComProgresso = { ...DESAFIO_ATIVO, progresso: 3600 };
    const resultado = calcularProgressoReducao(desafioComProgresso, logs, APPS, false);
    expect(resultado).toEqual({ progressoSegundos: 3600, ultrapassou: false, semMedicaoDesde: 'segunda-feira' });
  });
});

describe('statusAoFechar', () => {
  it('progresso dentro da meta conclui', () => expect(statusAoFechar(20000, 20400)).toBe('concluido'));
  it('progresso igual à meta conclui', () => expect(statusAoFechar(20400, 20400)).toBe('concluido'));
  it('progresso acima da meta expira', () => expect(statusAoFechar(21000, 20400)).toBe('expirado'));
});

describe('diasRestantes', () => {
  it('segunda-feira (início da semana) até domingo (dataFim) são 6 dias restantes', () => {
    expect(diasRestantes(new Date(2026, 9, 19), '2026-10-25')).toBe(6);
  });
  it('sábado tem 1 dia restante', () => {
    expect(diasRestantes(new Date(2026, 9, 24), '2026-10-25')).toBe(1);
  });
  it('domingo (último dia) tem 0 dias restantes', () => {
    expect(diasRestantes(new Date(2026, 9, 25), '2026-10-25')).toBe(0);
  });
});

describe('textoDiasRestantes', () => {
  it('0 vira "Último dia"', () => expect(textoDiasRestantes(0)).toBe('Último dia'));
  it('1 vira singular "1 dia restante"', () => expect(textoDiasRestantes(1)).toBe('1 dia restante'));
  it('6 vira plural "6 dias restantes"', () => expect(textoDiasRestantes(6)).toBe('6 dias restantes'));
});

describe('textoResultadoAnterior', () => {
  it('concluído gera a frase de resultado', () => {
    expect(textoResultadoAnterior({ ...DESAFIO_ATIVO, status: 'concluido' }))
      .toBe('Você fechou a semana passada dentro do combinado.');
  });
  it('expirado não gera texto', () => {
    expect(textoResultadoAnterior({ ...DESAFIO_ATIVO, status: 'expirado' })).toBeNull();
  });
  it('sem desafio anterior não gera texto', () => {
    expect(textoResultadoAnterior(null)).toBeNull();
  });
});
