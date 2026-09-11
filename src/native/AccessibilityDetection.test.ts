import { DeviceEventEmitter, NativeModules } from 'react-native';
import {
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  subscribeToForegroundApp,
} from './AccessibilityDetection';

const moduloMock = {
  isAccessibilityServiceEnabled: jest.fn(),
  openAccessibilitySettings: jest.fn(),
};

describe('AccessibilityDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NativeModules as Record<string, unknown>).RootoraAccessibility = moduloMock;
  });

  afterEach(() => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
  });

  describe('isAccessibilityServiceEnabled', () => {
    it('repassa o resultado do módulo nativo', async () => {
      moduloMock.isAccessibilityServiceEnabled.mockResolvedValueOnce(true);
      await expect(isAccessibilityServiceEnabled()).resolves.toBe(true);
      expect(moduloMock.isAccessibilityServiceEnabled).toHaveBeenCalledTimes(1);
    });

    it('resolve false quando o módulo nativo não está linkado', async () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(isAccessibilityServiceEnabled()).resolves.toBe(false);
    });
  });

  describe('openAccessibilitySettings', () => {
    it('chama o módulo nativo', () => {
      openAccessibilitySettings();
      expect(moduloMock.openAccessibilitySettings).toHaveBeenCalledTimes(1);
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() => openAccessibilitySettings()).not.toThrow();
    });
  });

  describe('subscribeToForegroundApp', () => {
    it('registra o listener no evento certo e chama o callback com o packageName', () => {
      const callback = jest.fn();
      subscribeToForegroundApp(callback);

      DeviceEventEmitter.emit('app-foreground-changed', {
        packageName: 'com.instagram.android',
      });

      expect(callback).toHaveBeenCalledWith('com.instagram.android');
    });

    it('ignora evento sem packageName', () => {
      const callback = jest.fn();
      subscribeToForegroundApp(callback);

      DeviceEventEmitter.emit('app-foreground-changed', {});
      DeviceEventEmitter.emit('app-foreground-changed', undefined);

      expect(callback).not.toHaveBeenCalled();
    });

    it('a função retornada remove o listener', () => {
      const callback = jest.fn();
      const unsubscribe = subscribeToForegroundApp(callback);

      unsubscribe();
      DeviceEventEmitter.emit('app-foreground-changed', {
        packageName: 'com.whatsapp',
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
