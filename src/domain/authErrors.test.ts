import { mapearErroAuth } from './authErrors';

describe('mapearErroAuth', () => {
  it('mapeia códigos conhecidos do Firebase Auth', () => {
    expect(mapearErroAuth('auth/wrong-password')).toBe(
      'E-mail ou senha não conferem',
    );
    expect(mapearErroAuth('auth/user-not-found')).toBe(
      'E-mail ou senha não conferem',
    );
    expect(mapearErroAuth('auth/email-already-in-use')).toBe(
      'Esse e-mail já tem uma conta. Entrar em vez de cadastrar?',
    );
    expect(mapearErroAuth('auth/weak-password')).toBe(
      'A senha precisa ter pelo menos 6 caracteres',
    );
    expect(mapearErroAuth('auth/invalid-email')).toBe(
      'Verifique o formato do e-mail',
    );
  });

  it('mapeia o código de Play Services ausente do Google Sign-In', () => {
    expect(mapearErroAuth('google/play-services-not-available')).toBe(
      'Não conseguimos usar o login do Google neste dispositivo. Tente com e-mail e senha.',
    );
  });

  it('retorna a mensagem padrão para código desconhecido ou ausente', () => {
    const padrao =
      'Não conseguimos conectar agora. Tentar de novo em alguns instantes.';
    expect(mapearErroAuth('auth/algo-nao-mapeado')).toBe(padrao);
    expect(mapearErroAuth(undefined)).toBe(padrao);
  });
});
