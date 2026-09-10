// Banco LOCAL de frases da Splash — não busca no Firestore de propósito:
// a Splash roda no boot do app, momento em que a rede pode nem estar
// pronta, e uma latência aqui atrasaria a abertura. Mesmo padrão de
// taskFeedbackMessages.ts. Para trocar as frases, basta editar o array.
export const MENSAGENS_SPLASH = [
  'Toda raiz começa no escuro.',
  'Um passo de cada vez.',
  'Consistência se constrói devagar.',
] as const;

export function obterMensagemSplash(): string {
  const indice = Math.floor(Math.random() * MENSAGENS_SPLASH.length);
  return MENSAGENS_SPLASH[indice];
}
