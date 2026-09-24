import { DeviceEventEmitter, NativeModules } from 'react-native';
import {
  abrirApp,
  getInitialBlockedPackage,
  getInstalledApps,
  isAccessibilityServiceEnabled,
  limparSessaoAtiva,
  openAccessibilitySettings,
  registrarDesbloqueioTemporario,
  salvarRegrasBloqueio,
  salvarSessaoAtiva,
  salvarSnapshotDoDia,
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
  abrirApp: jest.fn(),
  salvarSnapshotDoDia: jest.fn(),
  salvarRegrasBloqueio: jest.fn(),
  salvarSessaoAtiva: jest.fn(),
  limparSessaoAtiva: jest.fn(),
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

  describe('salvarSnapshotDoDia', () => {
    it('serializa o snapshot e chama o módulo nativo', () => {
      const snapshot = {
        tarefas: [
          { id: '1', titulo: 'Ler', essencial: true, concluida: false },
        ],
      };
      salvarSnapshotDoDia(snapshot);

      expect(moduloMock.salvarSnapshotDoDia).toHaveBeenCalledWith(
        JSON.stringify(snapshot),
      );
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() => salvarSnapshotDoDia({ tarefas: [] })).not.toThrow();
    });
  });

  describe('salvarRegrasBloqueio', () => {
    it('serializa as regras e chama o módulo nativo', () => {
      const regras = {
        apps: ['com.instagram.android'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3] }],
      };
      salvarRegrasBloqueio(regras);

      expect(moduloMock.salvarRegrasBloqueio).toHaveBeenCalledWith(
        JSON.stringify(regras),
      );
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() =>
        salvarRegrasBloqueio({ apps: [], janelas: [] }),
      ).not.toThrow();
    });
  });

  describe('salvarSessaoAtiva', () => {
    it('serializa a sessão e chama o módulo nativo', () => {
      const sessao = {
        packageName: 'com.instagram.android',
        tarefaId: 'tarefa-1',
        estadoTravado: 'confusao' as const,
        fimEm: 1700000000000,
      };
      salvarSessaoAtiva(sessao);

      expect(moduloMock.salvarSessaoAtiva).toHaveBeenCalledWith(
        JSON.stringify(sessao),
      );
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() =>
        salvarSessaoAtiva({
          packageName: 'com.instagram.android',
          tarefaId: null,
          estadoTravado: null,
          fimEm: 0,
        }),
      ).not.toThrow();
    });
  });

  describe('limparSessaoAtiva', () => {
    it('chama o módulo nativo', () => {
      limparSessaoAtiva();
      expect(moduloMock.limparSessaoAtiva).toHaveBeenCalledTimes(1);
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() => limparSessaoAtiva()).not.toThrow();
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

  describe('abrirApp', () => {
    it('repassa o resultado do módulo nativo (sucesso)', async () => {
      moduloMock.abrirApp.mockResolvedValueOnce(true);

      await expect(abrirApp('com.instagram.android')).resolves.toBe(true);
      expect(moduloMock.abrirApp).toHaveBeenCalledWith('com.instagram.android');
    });

    it('repassa false quando o app não pôde ser reaberto', async () => {
      moduloMock.abrirApp.mockResolvedValueOnce(false);

      await expect(abrirApp('com.instagram.android')).resolves.toBe(false);
    });

    it('resolve false quando o módulo nativo não está linkado', async () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(abrirApp('com.instagram.android')).resolves.toBe(false);
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
