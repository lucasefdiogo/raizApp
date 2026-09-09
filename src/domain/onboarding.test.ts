import {
  onboardingEstaCompleto,
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
