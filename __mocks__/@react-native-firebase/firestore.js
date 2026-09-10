let armazenamento = {};

function getFirestore() {
  return {};
}

function doc(_firestoreInstance, ...segmentosCaminho) {
  return { __caminho: segmentosCaminho.join('/') };
}

function collection(_firestoreInstance, ...segmentosCaminho) {
  return { __colecao: segmentosCaminho.join('/') };
}

function query(ref, ...constraints) {
  return { ...ref, __constraints: constraints };
}

function limit(quantidade) {
  return { __tipo: 'limit', __valor: quantidade };
}

const getDoc = jest.fn(async ref => {
  const dados = armazenamento[ref.__caminho];
  return {
    exists: () => dados !== undefined,
    data: () => dados,
  };
});

const getDocs = jest.fn(async ref => {
  const prefixo = `${ref.__colecao}/`;
  let chaves = Object.keys(armazenamento).filter(
    chave =>
      chave.startsWith(prefixo) &&
      !chave.slice(prefixo.length).includes('/'),
  );

  const restricaoLimit = (ref.__constraints || []).find(
    restricao => restricao && restricao.__tipo === 'limit',
  );
  if (restricaoLimit) {
    chaves = chaves.slice(0, restricaoLimit.__valor);
  }

  const docs = chaves.map(chave => ({
    id: chave.slice(prefixo.length),
    exists: () => true,
    data: () => armazenamento[chave],
  }));

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: callback => docs.forEach(callback),
  };
});

const setDoc = jest.fn(async (ref, dados, options) => {
  if (options && options.merge) {
    armazenamento[ref.__caminho] = { ...(armazenamento[ref.__caminho] || {}), ...dados };
  } else {
    armazenamento[ref.__caminho] = { ...dados };
  }
});

const serverTimestamp = jest.fn(() => 'MOCK_SERVER_TIMESTAMP');

function __reset() {
  armazenamento = {};
  getDoc.mockClear();
  getDocs.mockClear();
  setDoc.mockClear();
  serverTimestamp.mockClear();
}

function __dados(caminho) {
  return armazenamento[caminho];
}

module.exports = {
  getFirestore,
  doc,
  collection,
  query,
  limit,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  __reset,
  __dados,
};
