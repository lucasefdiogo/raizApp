import { DeviceEventEmitter, NativeModules } from 'react-native';
import {
  getInitialBlockedPackage,
  getInstalledApps,
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  registrarDesbloqueioTemporario,
  subscribeToBlockedApp,
  subscribeToForegroundApp,
  syncBloqueioConfig,
} from './AccessibilityDetection';

const moduloMock = {
  isAccessibilityServiceEnabled: jest.fn(),
  openAccessibilitySettings: jest.fn(),
  getInstalledApps: jest.fn(),
  syncBloqueioConfig: jest.fn(),
  registrarDesbloqueioTemporario: jest.fn(),
  getInitialBlockedPackage: jest.fn(),
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

  describe('getInstalledApps', () => {
    it('formata o ícone em base64 como data URI de PNG', async () => {
      moduloMock.getInstalledApps.mockResolvedValueOnce([
        { packageName: 'com.instagram.android', nome: 'Instagram', icone: 'QQ==' },
      ]);

      await expect(getInstalledApps()).resolves.toEqual([
        {
          packageName: 'com.instagram.android',
          nome: 'Instagram',
          icone: 'data:image/png;base64,QQ==',
        },
      ]);
    });

    it('mantém icone null quando o nativo não conseguiu converter', async () => {
      moduloMock.getInstalledApps.mockResolvedValueOnce([
        { packageName: 'com.whatsapp', nome: 'WhatsApp', icone: null },
      ]);

      const [app] = await getInstalledApps();
      expect(app.icone).toBeNull();
    });

    it('resolve lista vazia quando o módulo nativo não está linkado', async () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(getInstalledApps()).resolves.toEqual([]);
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

  describe('syncBloqueioConfig', () => {
    it('serializa a config e chama o módulo nativo', () => {
      syncBloqueioConfig({
        ativo: true,
        appsSelecionados: ['com.instagram.android'],
        horarioInicio: '09:00',
        horarioFim: '18:00',
      });

      expect(moduloMock.syncBloqueioConfig).toHaveBeenCalledWith(
        JSON.stringify({
          ativo: true,
          appsSelecionados: ['com.instagram.android'],
          horarioInicio: '09:00',
          horarioFim: '18:00',
        }),
      );
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() =>
        syncBloqueioConfig({
          ativo: false,
          appsSelecionados: [],
          horarioInicio: null,
          horarioFim: null,
        }),
      ).not.toThrow();
    });
  });

  describe('registrarDesbloqueioTemporario', () => {
    it('repassa packageName e minutos pro módulo nativo', () => {
      registrarDesbloqueioTemporario('com.instagram.android', 15);

      expect(moduloMock.registrarDesbloqueioTemporario).toHaveBeenCalledWith(
        'com.instagram.android',
        15,
      );
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() =>
        registrarDesbloqueioTemporario('com.instagram.android', 15),
      ).not.toThrow();
    });
  });

  describe('getInitialBlockedPackage', () => {
    it('repassa o resultado do módulo nativo', async () => {
      moduloMock.getInitialBlockedPackage.mockResolvedValueOnce(
        'com.instagram.android',
      );
      await expect(getInitialBlockedPackage()).resolves.toBe(
        'com.instagram.android',
      );
    });

    it('resolve null quando o módulo nativo não está linkado', async () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(getInitialBlockedPackage()).resolves.toBeNull();
    });
  });

  describe('subscribeToBlockedApp', () => {
    it('registra o listener no evento certo e chama o callback com o packageName', () => {
      const callback = jest.fn();
      subscribeToBlockedApp(callback);

      DeviceEventEmitter.emit('blocked-app-detected', {
        packageName: 'com.instagram.android',
      });

      expect(callback).toHaveBeenCalledWith('com.instagram.android');
    });

    it('ignora evento sem packageName', () => {
      const callback = jest.fn();
      subscribeToBlockedApp(callback);

      DeviceEventEmitter.emit('blocked-app-detected', {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('a função retornada remove o listener', () => {
      const callback = jest.fn();
      const unsubscribe = subscribeToBlockedApp(callback);

      unsubscribe();
      DeviceEventEmitter.emit('blocked-app-detected', {
        packageName: 'com.whatsapp',
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
