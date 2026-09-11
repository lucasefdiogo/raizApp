import {
  calcularNivelDesbloqueio,
  exigeReflexao,
  obterDuracaoRespiracao,
} from './appBlockEscalation';

describe('calcularNivelDesbloqueio', () => {
  it('0 desbloqueios hoje (1º do dia): nível 1', () => {
    expect(calcularNivelDesbloqueio(0)).toBe(1);
  });

  it('1 desbloqueio hoje (2º do dia): nível 2', () => {
    expect(calcularNivelDesbloqueio(1)).toBe(2);
  });

  it('2 desbloqueios hoje (3º do dia): nível 3', () => {
    expect(calcularNivelDesbloqueio(2)).toBe(3);
  });

  it('teto: 3, 4 ou 10 desbloqueios hoje continuam nível 3, nunca 4/5', () => {
    expect(calcularNivelDesbloqueio(3)).toBe(3);
    expect(calcularNivelDesbloqueio(4)).toBe(3);
    expect(calcularNivelDesbloqueio(10)).toBe(3);
  });
});

describe('obterDuracaoRespiracao', () => {
  it('nível 1: 60 segundos (comportamento atual, sem mudança)', () => {
    expect(obterDuracaoRespiracao(1)).toBe(60);
  });

  it('nível 2: 90 segundos', () => {
    expect(obterDuracaoRespiracao(2)).toBe(90);
  });

  it('nível 3: 120 segundos (teto, não escala mais)', () => {
    expect(obterDuracaoRespiracao(3)).toBe(120);
  });
});

describe('exigeReflexao', () => {
  it('nível 1: false — tarefas concluídas liberam na hora, sem reflexão', () => {
    expect(exigeReflexao(1)).toBe(false);
  });

  it('nível 2: true', () => {
    expect(exigeReflexao(2)).toBe(true);
  });

  it('nível 3: true (mesma exigência do nível 2, não fica mais difícil)', () => {
    expect(exigeReflexao(3)).toBe(true);
  });
});
