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
const reauthenticateWithCredential = jest.fn(async () => {});
const deleteUser = jest.fn(async () => {
  currentUser = null;
  listeners.forEach(cb => cb(null));
});

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

const EmailAuthProvider = {
  credential: jest.fn((email, password) => ({
    providerId: 'password',
    email,
    password,
  })),
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
  reauthenticateWithCredential.mockClear();
  reauthenticateWithCredential.mockImplementation(async () => {});
  deleteUser.mockClear();
  deleteUser.mockImplementation(async () => {
    currentUser = null;
    listeners.forEach(cb => cb(null));
  });
  GoogleAuthProvider.credential.mockClear();
  EmailAuthProvider.credential.mockClear();
}

module.exports = {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  deleteUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  EmailAuthProvider,
  __setCurrentUser,
  __reset,
};
