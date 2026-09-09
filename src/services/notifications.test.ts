import {
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
} from './notifications';

const notifeeMock = require('@notifee/react-native');

describe('services/notifications', () => {
  beforeEach(() => {
    notifeeMock.__reset();
    jest.useRealTimers();
  });

  describe('agendarLembreteDiario', () => {
    it('cancela o lembrete diário anterior antes de criar um novo', async () => {
      await agendarLembreteDiario('08:00');

      expect(notifeeMock.cancelTriggerNotification).toHaveBeenCalledWith(
        'lembrete-diario',
      );
      expect(notifeeMock.createTriggerNotification).toHaveBeenCalledTimes(1);

      const [, trigger] = notifeeMock.createTriggerNotification.mock.calls[0];
      expect(trigger.repeatFrequency).toBe(notifeeMock.RepeatFrequency.DAILY);
    });

    it('a ordem de chamadas é sempre cancelar antes de criar', async () => {
      const ordem: string[] = [];
      notifeeMock.cancelTriggerNotification.mockImplementation(async () => {
        ordem.push('cancelar');
      });
      notifeeMock.createTriggerNotification.mockImplementation(async () => {
        ordem.push('criar');
        return 'id';
      });

      await agendarLembreteDiario('08:00');

      expect(ordem).toEqual(['cancelar', 'criar']);
    });
  });

  describe('avaliarNecessidadeAlertaRisco', () => {
    it('essencial concluída: cancela o alerta de risco de hoje e não cria nada', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-15T15:00:00'));

      await avaliarNecessidadeAlertaRisco(true);

      expect(notifeeMock.cancelTriggerNotification).toHaveBeenCalledWith(
        'risco-streak-2026-09-15',
      );
      expect(notifeeMock.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('essencial não concluída e antes das 20:00: agenda o alerta de risco pra hoje', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-15T15:00:00'));

      await avaliarNecessidadeAlertaRisco(false);

      expect(notifeeMock.cancelTriggerNotification).toHaveBeenCalledWith(
        'risco-streak-2026-09-15',
      );
      expect(notifeeMock.createTriggerNotification).toHaveBeenCalledTimes(1);

      const [notification, trigger] =
        notifeeMock.createTriggerNotification.mock.calls[0];
      expect(notification.id).toBe('risco-streak-2026-09-15');
      const disparo = new Date(trigger.timestamp);
      expect(disparo.getHours()).toBe(20);
    });

    it('essencial não concluída, mas já passou das 20:00: não agenda nada', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-15T21:00:00'));

      await avaliarNecessidadeAlertaRisco(false);

      expect(notifeeMock.cancelTriggerNotification).toHaveBeenCalledWith(
        'risco-streak-2026-09-15',
      );
      expect(notifeeMock.createTriggerNotification).not.toHaveBeenCalled();
    });
  });
});
