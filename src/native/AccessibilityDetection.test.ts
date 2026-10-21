import { DeviceEventEmitter, NativeModules } from 'react-native';
import {
  abrirApp,
  isAccessibilityServiceEnabled,
  limparSessaoAtiva,
  listarAppsInstalados,
  openAccessibilitySettings,
  liberarBloco,
  obterEstadoBloqueio,
  parseVisaoBloqueio,
  recusarTolerancia,
  usarTolerancia,
  salvarRegrasBloqueio,
  salvarRegrasBloqueioPendentes,
  salvarSessaoAtiva,
  salvarSnapshotDoDia,
  subscribeToForegroundApp,
} from './AccessibilityDetection';

const moduloMock = {
  isAccessibilityServiceEnabled: jest.fn(),
  openAccessibilitySettings: jest.fn(),
  obterEstadoBloqueio: jest.fn(),
  liberarBloco: jest.fn(),
  abrirApp: jest.fn(),
  salvarSnapshotDoDia: jest.fn(),
  salvarRegrasBloqueio: jest.fn(),
  salvarRegrasBloqueioPendentes: jest.fn(),
  salvarSessaoAtiva: jest.fn(),
  limparSessaoAtiva: jest.fn(),
  listarAppsInstalados: jest.fn(),
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

  describe('salvarRegrasBloqueioPendentes', () => {
    it('serializa a pendência e chama o módulo nativo', () => {
      const pendente = {
        apps: ['com.instagram.android'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3] }],
        efetivaEm: '2026-09-25',
      };
      salvarRegrasBloqueioPendentes(pendente);

      expect(moduloMock.salvarRegrasBloqueioPendentes).toHaveBeenCalledWith(
        JSON.stringify(pendente),
      );
    });

    it('null limpa a pendência do lado nativo', () => {
      salvarRegrasBloqueioPendentes(null);

      expect(moduloMock.salvarRegrasBloqueioPendentes).toHaveBeenCalledWith(null);
    });

    it('não quebra quando o módulo nativo não está linkado', () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      expect(() => salvarRegrasBloqueioPendentes(null)).not.toThrow();
    });
  });

  describe('listarAppsInstalados', () => {
    it('repassa a lista do módulo nativo', async () => {
      const apps = [
        { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'abc' },
      ];
      moduloMock.listarAppsInstalados.mockResolvedValueOnce(apps);

      await expect(listarAppsInstalados()).resolves.toEqual(apps);
    });

    it('resolve lista vazia quando o módulo nativo não está linkado', async () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(listarAppsInstalados()).resolves.toEqual([]);
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

  describe('saldo de sessões (estado, liberar)', () => {
    const visao = {
      estado: { dia: '2026-10-11', fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
      config: { duracaoBlocoMin: 15 },
      agora: 1700000000000,
    };

    it('obterEstadoBloqueio parseia o JSON do nativo', async () => {
      moduloMock.obterEstadoBloqueio.mockResolvedValueOnce(JSON.stringify(visao));
      await expect(obterEstadoBloqueio()).resolves.toEqual(visao);
    });

    it('obterEstadoBloqueio resolve null sem o módulo nativo', async () => {
      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(obterEstadoBloqueio()).resolves.toBeNull();
    });

    it('parseVisaoBloqueio: null para ausente, malformado ou incompleto', () => {
      expect(parseVisaoBloqueio(undefined)).toBeNull();
      expect(parseVisaoBloqueio('{nao e json')).toBeNull();
      expect(parseVisaoBloqueio(JSON.stringify({ estado: {} }))).toBeNull();
    });

    it('liberarBloco repassa o resultado do nativo e resolve false sem o módulo', async () => {
      moduloMock.liberarBloco.mockResolvedValueOnce(true);
      await expect(liberarBloco()).resolves.toBe(true);
      expect(moduloMock.liberarBloco).toHaveBeenCalledTimes(1);

      delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
      await expect(liberarBloco()).resolves.toBe(false);
    });

    it('CA-03: o wrapper TS expõe sessão ativa, aviso de 1 minuto e cooldown sem campos de tolerância', async () => {
      const sessao = {
        estado: { dia: '2026-10-11', fase: 'SESSAO_ATIVA', fgDesde: 1700000000000 },
        config: { duracaoBlocoMin: 15, cooldownMin: 45 },
        agora: 1700000000000,
        msRestantes: 50000,
        avisoUmMinutoAtivo: true,
        msAteAviso: 0,
      };
      const v = parseVisaoBloqueio(JSON.stringify(sessao));
      expect(v?.estado.fase).toBe('SESSAO_ATIVA');
      expect(v?.msRestantes).toBe(50000);
      expect(v?.avisoUmMinutoAtivo).toBe(true);
      expect(v?.msAteAviso).toBe(0);
      expect(v?.config).not.toHaveProperty('toleranciaMin');

      const cooldown = {
        estado: { dia: '2026-10-11', fase: 'COOLDOWN', fimCooldownEm: 1700002700000 },
        config: { duracaoBlocoMin: 15, cooldownMin: 45 },
        agora: 1700000000000,
        msRestantes: 0,
        avisoUmMinutoAtivo: false,
      };
      const c = parseVisaoBloqueio(JSON.stringify(cooldown));
      expect(c?.estado.fase).toBe('COOLDOWN');
      expect(c?.estado.fimCooldownEm).toBe(1700002700000);
      expect(c?.avisoUmMinutoAtivo).toBe(false);
      expect(c?.msAteAviso).toBeUndefined();
      expect(c?.estado).not.toHaveProperty('toleranciaAtiva');
    });

    it('CA-06: o wrapper TS aceita blocosDiarios ausente como sem limite', () => {
      const v = parseVisaoBloqueio(
        JSON.stringify({
          estado: { dia: '2026-10-11', fase: 'AGUARDANDO_LIBERACAO' },
          config: { duracaoBlocoMin: 15, cooldownMin: 45 },
          agora: 1700000000000,
        }),
      );
      expect(v).not.toBeNull();
      expect(v?.config.blocosDiarios ?? null).toBeNull();

      const comLimite = parseVisaoBloqueio(
        JSON.stringify({
          estado: { dia: '2026-10-11', fase: 'AGUARDANDO_LIBERACAO' },
          config: { blocosDiarios: 3 },
          agora: 1700000000000,
        }),
      );
      expect(comLimite?.config.blocosDiarios).toBe(3);
    });

    it('os módulos de tolerância não são mais chamados no nativo (shim resolve false)', async () => {
      await expect(usarTolerancia()).resolves.toBe(false);
      await expect(recusarTolerancia()).resolves.toBe(false);
      expect(Object.keys(moduloMock)).not.toContain('usarTolerancia');
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
});
