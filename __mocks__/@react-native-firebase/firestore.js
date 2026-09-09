let armazenamento = {};

function getFirestore() {
  return {};
}

function doc(_firestoreInstance, ...segmentosCaminho) {
  return { __caminho: segmentosCaminho.join('/') };
}

const getDoc = jest.fn(async ref => {
  const dados = armazenamento[ref.__caminho];
  return {
    exists: () => dados !== undefined,
    data: () => dados,
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
  setDoc.mockClear();
  serverTimestamp.mockClear();
}

function __dados(caminho) {
  return armazenamento[caminho];
}

module.exports = {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  __reset,
  __dados,
};
