function getAnalytics() {
  return {};
}

const logEvent = jest.fn(async () => {});
const setUserId = jest.fn(async () => {});

function __reset() {
  logEvent.mockClear();
  setUserId.mockClear();
}

module.exports = {
  getAnalytics,
  logEvent,
  setUserId,
  __reset,
};
