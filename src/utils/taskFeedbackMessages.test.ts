import {
  MENSAGENS_TAREFA_CONCLUIDA,
  obterMensagemTarefaConcluida,
} from './taskFeedbackMessages';

describe('obterMensagemTarefaConcluida', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna a primeira frase quando Math.random resolve para o início do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(obterMensagemTarefaConcluida()).toBe(MENSAGENS_TAREFA_CONCLUIDA[0]);
  });

  it('retorna a segunda frase quando Math.random resolve pro meio do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.34);
    expect(obterMensagemTarefaConcluida()).toBe(MENSAGENS_TAREFA_CONCLUIDA[1]);
  });

  it('retorna a terceira frase quando Math.random resolve perto do fim do array', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(obterMensagemTarefaConcluida()).toBe(MENSAGENS_TAREFA_CONCLUIDA[2]);
  });

  it('sempre retorna uma das três frases exatas', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(MENSAGENS_TAREFA_CONCLUIDA).toContain(obterMensagemTarefaConcluida());
    }
  });
});
