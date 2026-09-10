import {
  onboardingEstaCompleto,
  passoInicialOnboarding,
  PASSO_ONBOARDING,
  validarFocoProcrastinacao,
  validarPorqueTexto,
  validarTempoTelaEstimado,
} from './onboarding';
import { OnboardingData } from './types';

describe('validarPorqueTexto', () => {
  it('rejeita texto vazio ou muito curto', () => {
    expect(validarPorqueTexto('')).toBe(false);
    expect(validarPorqueTexto('   ')).toBe(false);
    expect(validarPorqueTexto('curto')).toBe(false);
  });

  it('aceita texto com tamanho mínimo', () => {
    expect(validarPorqueTexto('Quero terminar meus estudos')).toBe(true);
  });
});

describe('validarFocoProcrastinacao', () => {
  it('rejeita quando nada foi escolhido', () => {
    expect(validarFocoProcrastinacao(null)).toBe(false);
  });

  it('aceita uma opção válida', () => {
    expect(validarFocoProcrastinacao('estudos')).toBe(true);
  });
});

describe('validarTempoTelaEstimado', () => {
  it('rejeita nulo, zero ou valores fora da faixa', () => {
    expect(validarTempoTelaEstimado(null)).toBe(false);
    expect(validarTempoTelaEstimado(0)).toBe(false);
    expect(validarTempoTelaEstimado(30)).toBe(false);
  });

  it('aceita valores dentro da faixa', () => {
    expect(validarTempoTelaEstimado(4)).toBe(true);
  });
});

describe('onboardingEstaCompleto', () => {
  it('retorna false se qualquer campo estiver incompleto', () => {
    const dados: OnboardingData = {
      porqueTexto: 'Quero terminar meus estudos',
      focoProcrastinacao: 'estudos',
      tempoTelaEstimado: null,
    };
    expect(onboardingEstaCompleto(dados)).toBe(false);
  });

  it('retorna true quando todos os campos são válidos', () => {
    const dados: OnboardingData = {
      porqueTexto: 'Quero terminar meus estudos',
      focoProcrastinacao: 'estudos',
      tempoTelaEstimado: 4,
    };
    expect(onboardingEstaCompleto(dados)).toBe(true);
  });
});

describe('passoInicialOnboarding', () => {
  it('sem foco escolhido ainda: começa no passo do foco', () => {
    expect(
      passoInicialOnboarding({
        focoProcrastinacao: null,
        tempoTelaEstimado: null,
        porqueTexto: '',
      }),
    ).toBe(PASSO_ONBOARDING.foco);
  });

  it('tem foco mas ainda não o tempo de tela: começa no passo do tempo', () => {
    expect(
      passoInicialOnboarding({
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: null,
        porqueTexto: '',
      }),
    ).toBe(PASSO_ONBOARDING.tempoTela);
  });

  it('tem foco e tempo, falta o porquê: começa no passo do porquê', () => {
    expect(
      passoInicialOnboarding({
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 4,
        porqueTexto: '',
      }),
    ).toBe(PASSO_ONBOARDING.porque);
  });

  it('já tem tudo (navegação direta): permanece no passo do porquê', () => {
    expect(
      passoInicialOnboarding({
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 4,
        porqueTexto: 'Quero terminar meus estudos',
      }),
    ).toBe(PASSO_ONBOARDING.porque);
  });

  it('tempo de tela fora da faixa conta como não respondido', () => {
    expect(
      passoInicialOnboarding({
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 0,
        porqueTexto: '',
      }),
    ).toBe(PASSO_ONBOARDING.tempoTela);
  });
});
