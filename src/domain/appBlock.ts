/**
 * Adiciona ou remove `packageName` da seleção — a única regra de negócio
 * real desta feature (o resto é CRUD de configuração). Pura, sem
 * React/Firebase, pra ser fácil de testar isolada.
 */
export function alternarAppNaSelecao(
  selecionados: string[],
  packageName: string,
): string[] {
  return selecionados.includes(packageName)
    ? selecionados.filter(pacote => pacote !== packageName)
    : [...selecionados, packageName];
}

function paraMinutosDoDia(horario: string): number | null {
  const partes = horario.split(':');
  if (partes.length !== 2) {
    return null;
  }
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) {
    return null;
  }
  return horas * 60 + minutos;
}

/**
 * Mesma lógica de janela de horário do lado nativo (BloqueioPrefs.kt,
 * dentroDoHorario) — replicada aqui em JS só pra exibição na Home (o
 * "ativoAgora" é indicativo, não precisa estar sincronizado ao segundo
 * com o que o AccessibilityService de fato aplica). Trata o caso da janela
 * atravessar a meia-noite (ex: 22:00-06:00).
 */
export function estaDentroDaJanelaDeHorario(
  horarioInicio: string | null,
  horarioFim: string | null,
  agora: Date = new Date(),
): boolean {
  if (!horarioInicio || !horarioFim) {
    return false;
  }

  const minutosInicio = paraMinutosDoDia(horarioInicio);
  const minutosFim = paraMinutosDoDia(horarioFim);
  if (minutosInicio === null || minutosFim === null) {
    return false;
  }

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  return minutosInicio <= minutosFim
    ? minutosAgora >= minutosInicio && minutosAgora <= minutosFim
    : minutosAgora >= minutosInicio || minutosAgora <= minutosFim;
}
