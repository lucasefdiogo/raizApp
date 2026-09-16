function getCrashlytics() {
  return {};
}

const recordError = jest.fn();
const setUserId = jest.fn(async () => null);
const crash = jest.fn();

function __reset() {
  recordError.mockClear();
  setUserId.mockClear();
  crash.mockClear();
}

module.exports = {
  getCrashlytics,
  recordError,
  setUserId,
  crash,
  __reset,
};
