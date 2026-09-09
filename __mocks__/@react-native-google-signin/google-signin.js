const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};

const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
  signIn: jest.fn(),
  signOut: jest.fn().mockResolvedValue(null),
};

function isErrorWithCode(erro) {
  return !!erro && typeof erro === 'object' && 'code' in erro;
}

function __reset() {
  GoogleSignin.configure.mockReset();
  GoogleSignin.hasPlayServices.mockReset().mockResolvedValue(true);
  GoogleSignin.signIn.mockReset();
  GoogleSignin.signOut.mockReset().mockResolvedValue(null);
}

module.exports = { GoogleSignin, statusCodes, isErrorWithCode, __reset };
