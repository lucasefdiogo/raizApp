export const MENSAGENS_TAREFA_CONCLUIDA = [
  'Feito. Isso conta.',
  'Mais um passo real.',
  'Você fez o que disse que faria. Isso é raro — e é assim que se constrói confiança.',
] as const;

export function obterMensagemTarefaConcluida(): string {
  const indice = Math.floor(Math.random() * MENSAGENS_TAREFA_CONCLUIDA.length);
  return MENSAGENS_TAREFA_CONCLUIDA[indice];
}
