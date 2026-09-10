import { MENSAGENS_SPLASH, obterMensagemSplash } from './splashMessages';

describe('obterMensagemSplash', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna a primeira frase quando Math.random resolve para o início do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(obterMensagemSplash()).toBe(MENSAGENS_SPLASH[0]);
  });

  it('retorna a frase do meio quando Math.random resolve pro meio do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(obterMensagemSplash()).toBe(MENSAGENS_SPLASH[1]);
  });

  it('retorna a última frase quando Math.random resolve perto do fim do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(obterMensagemSplash()).toBe(MENSAGENS_SPLASH[2]);
  });

  it('nunca sai de dentro do array, seja qual for o sorteio', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(MENSAGENS_SPLASH).toContain(obterMensagemSplash());
    }
  });

  it('as frases seguem o tom do produto (sem ponto de exclamação)', () => {
    MENSAGENS_SPLASH.forEach(frase => {
      expect(frase).not.toContain('!');
    });
  });
});
