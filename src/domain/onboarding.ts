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
