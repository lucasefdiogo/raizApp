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
 * Passos do onboarding, em ordem. `primeiraTarefa` é o último de propósito
 * (03-mvp.md/fundamentação teórica 10.3 — tarefa fatiada até o ponto de
 * aceitação sustenta o momentum): só depois dela o onboarding conta como
 * concluído (ver users/{uid}.onboardingConcluido, o gate real usado pelo
 * RootNavigator — não mais `porqueTexto`, que agora é só mais um passo
 * intermediário como foco/tempoTela).
 */
export const PASSO_ONBOARDING = {
  foco: 0,
  tempoTela: 1,
  porque: 2,
  primeiraTarefa: 3,
} as const;

export const TOTAL_PASSOS_ONBOARDING = 4;

/**
 * Dado o que já existe em users/{uid}, em qual passo o onboarding deve
 * retomar se o app foi fechado no meio do fluxo. Função pura — quem lê o
 * Firestore é o hook. Não dá pra saber por aqui se primeiraTarefa já foi
 * concluída (isso não é um campo de OnboardingData, é uma ação) — quem
 * chama só invoca isso quando onboardingConcluido ainda é false, então
 * "já tem foco+tempo+porquê" sempre aponta pra primeiraTarefa.
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
  if (!validarPorqueTexto(dados.porqueTexto)) {
    return PASSO_ONBOARDING.porque;
  }
  return PASSO_ONBOARDING.primeiraTarefa;
}
