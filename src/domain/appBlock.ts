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
