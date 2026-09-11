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

const increment = jest.fn(valor => ({ __increment: valor }));

function resolverIncrementos(dadosAnteriores, dadosNovos) {
  const resolvidos = {};
  for (const chave of Object.keys(dadosNovos)) {
    const valor = dadosNovos[chave];
    if (valor && typeof valor === 'object' && '__increment' in valor) {
      resolvidos[chave] = (dadosAnteriores[chave] || 0) + valor.__increment;
    } else {
      resolvidos[chave] = valor;
    }
  }
  return resolvidos;
}

const setDoc = jest.fn(async (ref, dados, options) => {
  const anterior = armazenamento[ref.__caminho] || {};
  const resolvidos = resolverIncrementos(anterior, dados);
  if (options && options.merge) {
    armazenamento[ref.__caminho] = { ...anterior, ...resolvidos };
  } else {
    armazenamento[ref.__caminho] = { ...resolvidos };
  }
});

const deleteDoc = jest.fn(async ref => {
  delete armazenamento[ref.__caminho];
});

function writeBatch() {
  const operacoes = [];
  const lote = {
    set(ref, dados, options) {
      operacoes.push(() => setDoc(ref, dados, options));
      return lote;
    },
    update(ref, dados) {
      operacoes.push(() => setDoc(ref, dados, { merge: true }));
      return lote;
    },
    delete(ref) {
      operacoes.push(() => deleteDoc(ref));
      return lote;
    },
    async commit() {
      for (const operacao of operacoes) {
        await operacao();
      }
    },
  };
  return lote;
}

const serverTimestamp = jest.fn(() => 'MOCK_SERVER_TIMESTAMP');

function __reset() {
  armazenamento = {};
  getDoc.mockClear();
  getDocs.mockClear();
  setDoc.mockClear();
  deleteDoc.mockClear();
  serverTimestamp.mockClear();
  increment.mockClear();
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
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment,
  __reset,
  __dados,
};
