// Banco LOCAL de frases de reforço pras notificações locais — não busca no
// Firestore no momento do disparo: a notificação pode agendar/disparar com
// o app em background, sem garantia de rede (mesmo padrão de
// splashMessages.ts/taskFeedbackMessages.ts). Serve tanto pro lembrete
// diário quanto pro alerta de risco de streak, por isso o tom é neutro, sem
// referência a manhã/noite.
export const MENSAGENS_NOTIFICACAO = [
  'Um passo pequeno também conta.',
  'Você já venceu dias mais difíceis que hoje.',
  'Não precisa ser perfeito. Precisa ser hoje.',
  'Sua raiz está observando o que você faz agora.',
] as const;

export function obterMensagemNotificacao(): string {
  const indice = Math.floor(Math.random() * MENSAGENS_NOTIFICACAO.length);
  return MENSAGENS_NOTIFICACAO[indice];
}
