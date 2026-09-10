import { FocoProcrastinacao, OnboardingData } from './types';

const TAMANHO_MINIMO_PORQUE = 10;
const TEMPO_TELA_MINIMO_HORAS = 0;
const TEMPO_TELA_MAXIMO_HORAS = 24;

export const OPCOES_FOCO_PROCRASTINACAO: {
  valor: FocoProcrastinacao;
  rotulo: string;
}[] = [
  { valor: 'redes_sociais', rotulo: 'Redes sociais' },
  { valor: 'estudos', rotulo: 'Estudos' },
  { valor: 'trabalho', rotulo: 'Trabalho' },
  { valor: 'organizacao_pessoal', rotulo: 'Organização pessoal' },
  { valor: 'outro', rotulo: 'Outro' },
];

export function validarPorqueTexto(texto: string): boolean {
  return texto.trim().length >= TAMANHO_MINIMO_PORQUE;
}

export function validarFocoProcrastinacao(
  foco: FocoProcrastinacao | null,
): boolean {
  return foco !== null;
}

export function validarTempoTelaEstimado(horas: number | null): boolean {
  return (
    horas !== null &&
    horas > TEMPO_TELA_MINIMO_HORAS &&
    horas <= TEMPO_TELA_MAXIMO_HORAS
  );
}

export function onboardingEstaCompleto(dados: OnboardingData): boolean {
  return (
    validarPorqueTexto(dados.porqueTexto) &&
    validarFocoProcrastinacao(dados.focoProcrastinacao) &&
    validarTempoTelaEstimado(dados.tempoTelaEstimado)
  );
}

/**
 * Passos do onboarding, em ordem. O porquê fica por último de propósito:
 * é ele que tira o usuário do onboarding (gate `!porqueTexto` no
 * RootNavigator), então só deve ser gravado depois que foco e tempo de
 * tela já estiverem persistidos.
 */
export const PASSO_ONBOARDING = {
  foco: 0,
  tempoTela: 1,
  porque: 2,
} as const;

export const TOTAL_PASSOS_ONBOARDING = 3;

/**
 * Dado o que já existe em users/{uid}, em qual passo o onboarding deve
 * retomar se o app foi fechado no meio do fluxo. Função pura — quem lê o
 * Firestore é o hook.
 */
export function passoInicialOnboarding(
  dados: Pick<
    OnboardingData,
    'focoProcrastinacao' | 'tempoTelaEstimado' | 'porqueTexto'
  >,
): number {
  if (!validarFocoProcrastinacao(dados.focoProcrastinacao)) {
    return PASSO_ONBOARDING.foco;
  }
  if (!validarTempoTelaEstimado(dados.tempoTelaEstimado)) {
    return PASSO_ONBOARDING.tempoTela;
  }
  return PASSO_ONBOARDING.porque;
}
