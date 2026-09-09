let armazenamento = {};

module.exports = {
  setItem: jest.fn((chave, valor) => {
    armazenamento[chave] = valor;
    return Promise.resolve();
  }),
  getItem: jest.fn(chave => Promise.resolve(armazenamento[chave] ?? null)),
  removeItem: jest.fn(chave => {
    delete armazenamento[chave];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    armazenamento = {};
    return Promise.resolve();
  }),
};
