const MENSAGEM_PADRAO =
  'Não conseguimos conectar agora. Tentar de novo em alguns instantes.';

const MENSAGENS_POR_CODIGO: Record<string, string> = {
  'auth/wrong-password': 'E-mail ou senha não conferem',
  'auth/user-not-found': 'E-mail ou senha não conferem',
  'auth/invalid-credential': 'E-mail ou senha não conferem',
  'auth/email-already-in-use':
    'Esse e-mail já tem uma conta. Entrar em vez de cadastrar?',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres',
  'auth/invalid-email': 'Verifique o formato do e-mail',
  'auth/network-request-failed': MENSAGEM_PADRAO,
  'google/play-services-not-available':
    'Não conseguimos usar o login do Google neste dispositivo. Tente com e-mail e senha.',
};

export function mapearErroAuth(codigo: string | undefined): string {
  if (!codigo) {
    return MENSAGEM_PADRAO;
  }
  return MENSAGENS_POR_CODIGO[codigo] ?? MENSAGEM_PADRAO;
}
