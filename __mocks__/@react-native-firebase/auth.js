let currentUser = null;
let listeners = [];

function getAuth() {
  return { currentUser };
}

const createUserWithEmailAndPassword = jest.fn();
const signInWithEmailAndPassword = jest.fn();
const signInWithCredential = jest.fn();
const signOut = jest.fn(async () => {
  currentUser = null;
  listeners.forEach(cb => cb(null));
});
const sendPasswordResetEmail = jest.fn();

function onAuthStateChanged(_auth, callback) {
  listeners.push(callback);
  callback(currentUser);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

const GoogleAuthProvider = {
  credential: jest.fn(idToken => ({ providerId: 'google.com', idToken })),
};

function __setCurrentUser(user) {
  currentUser = user;
  listeners.forEach(cb => cb(user));
}

function __reset() {
  currentUser = null;
  listeners = [];
  createUserWithEmailAndPassword.mockReset();
  signInWithEmailAndPassword.mockReset();
  signInWithCredential.mockReset();
  signOut.mockClear();
  sendPasswordResetEmail.mockReset();
  GoogleAuthProvider.credential.mockClear();
}

module.exports = {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  __setCurrentUser,
  __reset,
};
