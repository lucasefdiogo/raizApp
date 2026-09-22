import {
  MENSAGENS_NOTIFICACAO,
  obterMensagemNotificacao,
} from './notificationMessages';

describe('obterMensagemNotificacao', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna a primeira frase quando Math.random resolve para o início do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(obterMensagemNotificacao()).toBe(MENSAGENS_NOTIFICACAO[0]);
  });

  it('retorna a última frase quando Math.random resolve perto do fim do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(obterMensagemNotificacao()).toBe(
      MENSAGENS_NOTIFICACAO[MENSAGENS_NOTIFICACAO.length - 1],
    );
  });

  it('nunca sai de dentro do array, seja qual for o sorteio', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(MENSAGENS_NOTIFICACAO).toContain(obterMensagemNotificacao());
    }
  });

  it('as frases seguem o tom do produto (sem ponto de exclamação)', () => {
    MENSAGENS_NOTIFICACAO.forEach(frase => {
      expect(frase).not.toContain('!');
    });
  });
});
