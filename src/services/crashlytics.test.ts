import { registrarErro, setUsuarioId, testarCrash } from './crashlytics';

const crashlyticsMock = require('@react-native-firebase/crashlytics');

describe('services/crashlytics', () => {
  beforeEach(() => {
    crashlyticsMock.__reset();
  });

  describe('registrarErro', () => {
    it('chama recordError com o erro', () => {
      const erro = new Error('falha ao salvar');

      registrarErro(erro);

      expect(crashlyticsMock.recordError).toHaveBeenCalledWith(
        expect.anything(),
        erro,
        undefined,
      );
    });

    it('repassa o contexto quando informado', () => {
      const erro = new Error('falha ao salvar');

      registrarErro(erro, 'salvarDailyLog');

      expect(crashlyticsMock.recordError).toHaveBeenCalledWith(
        expect.anything(),
        erro,
        'salvarDailyLog',
      );
    });
  });

  describe('setUsuarioId', () => {
    it('chama setUserId com o uid', () => {
      setUsuarioId('uid-123');

      expect(crashlyticsMock.setUserId).toHaveBeenCalledWith(
        expect.anything(),
        'uid-123',
      );
    });

    it('chama setUserId com string vazia quando uid é null (logout/exclusão)', () => {
      setUsuarioId(null);

      expect(crashlyticsMock.setUserId).toHaveBeenCalledWith(
        expect.anything(),
        '',
      );
    });
  });

  describe('testarCrash', () => {
    it('chama crash() do módulo nativo em __DEV__', () => {
      testarCrash();

      expect(crashlyticsMock.crash).toHaveBeenCalledTimes(1);
    });

    it('não faz nada fora de __DEV__', () => {
      const devOriginal = __DEV__;
      // @ts-expect-error __DEV__ é `declare var` só-leitura no ambiente RN
      __DEV__ = false;

      try {
        testarCrash();
        expect(crashlyticsMock.crash).not.toHaveBeenCalled();
      } finally {
        // @ts-expect-error ver acima
        __DEV__ = devOriginal;
      }
    });

    it('funciona fora de __DEV__ quando MOSTRAR_TESTAR_CRASHLYTICS está ligada (build de teste em device)', () => {
      const devOriginal = __DEV__;
      // @ts-expect-error __DEV__ é `declare var` só-leitura no ambiente RN
      __DEV__ = false;
      jest.resetModules();
      jest.doMock('../config/debugFlags', () => ({
        MOSTRAR_DEBUG_ACESSIBILIDADE: false,
        MOSTRAR_TESTAR_CRASHLYTICS: true,
      }));

      try {
        const { testarCrash: testarCrashComFlag } = require('./crashlytics');
        const crashlyticsMockIsolado = require('@react-native-firebase/crashlytics');
        crashlyticsMockIsolado.__reset();

        testarCrashComFlag();

        expect(crashlyticsMockIsolado.crash).toHaveBeenCalledTimes(1);
      } finally {
        // @ts-expect-error ver acima
        __DEV__ = devOriginal;
        jest.dontMock('../config/debugFlags');
        jest.resetModules();
      }
    });
  });
});
