const requestPermission = jest.fn(async () => ({ authorizationStatus: 1 }));
const createChannel = jest.fn(async () => 'canal-mock');
const createTriggerNotification = jest.fn(async () => 'notificacao-mock');
const cancelTriggerNotification = jest.fn(async () => undefined);
const cancelTriggerNotifications = jest.fn(async () => undefined);
const cancelAllNotifications = jest.fn(async () => undefined);

function __reset() {
  requestPermission.mockClear();
  createChannel.mockClear();
  createTriggerNotification.mockClear();
  cancelTriggerNotification.mockClear();
  cancelTriggerNotifications.mockClear();
  cancelAllNotifications.mockClear();
}

const notifee = {
  requestPermission,
  createChannel,
  createTriggerNotification,
  cancelTriggerNotification,
  cancelTriggerNotifications,
  cancelAllNotifications,
  __reset,
};

module.exports = notifee;
module.exports.default = notifee;
module.exports.TriggerType = { TIMESTAMP: 0, INTERVAL: 1 };
module.exports.RepeatFrequency = { NONE: -1, HOURLY: 0, DAILY: 1, WEEKLY: 2 };
module.exports.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};
