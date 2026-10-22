import {
  MENSAGENS_NOTURNAS,
  proximaMensagemNoturna,
} from './mensagensNoturnas';

describe('proximaMensagemNoturna', () => {
  it('CA-05: duas escolhas seguidas devolvem mensagens diferentes do banco noturno', () => {
    const primeira = proximaMensagemNoturna(null);
    const segunda = proximaMensagemNoturna(primeira.indice);

    expect(segunda.indice).not.toBe(primeira.indice);
    expect(segunda.texto).not.toBe(primeira.texto);
    expect(MENSAGENS_NOTURNAS).toContain(primeira.texto);
    expect(MENSAGENS_NOTURNAS).toContain(segunda.texto);
    expect(segunda.indice).toBe(1);
  });

  it('CA-05: depois do último índice volta ao início do banco', () => {
    const ultimo = MENSAGENS_NOTURNAS.length - 1;
    const proxima = proximaMensagemNoturna(ultimo);

    expect(proxima.indice).toBe(0);
    expect(proxima.texto).toBe(MENSAGENS_NOTURNAS[0]);
  });

  it('CA-05: índice anterior inválido ou ausente começa do início do banco', () => {
    const invalidos = [
      undefined,
      null,
      -1,
      1.5,
      NaN,
      MENSAGENS_NOTURNAS.length,
      999,
    ];
    for (const anterior of invalidos) {
      const r = proximaMensagemNoturna(anterior);
      expect(r.indice).toBe(0);
      expect(r.texto).toBe(MENSAGENS_NOTURNAS[0]);
    }
  });
});

describe('MENSAGENS_NOTURNAS', () => {
  it('CA-04: nenhuma mensagem do banco tem exclamação nem a palavra proteção', () => {
    expect(MENSAGENS_NOTURNAS.length).toBeGreaterThanOrEqual(8);
    expect(MENSAGENS_NOTURNAS.length).toBeLessThanOrEqual(10);
    for (const texto of MENSAGENS_NOTURNAS) {
      expect(texto.trim().length).toBeGreaterThan(0);
      expect(texto).not.toContain('!');
      expect(texto.toLowerCase()).not.toMatch(/prote[cç][aã]o|protec/);
    }
  });
});
