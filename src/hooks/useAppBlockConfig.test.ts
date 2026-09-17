import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAppBlockConfig } from './useAppBlockConfig';

jest.mock('../services/firestore');
jest.mock('../native/AccessibilityDetection');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const firestore = require('../services/firestore');
const nativo = require('../native/AccessibilityDetection');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const APPS_MOCK = [
  { packageName: 'com.instagram.android', nome: 'Instagram', icone: null },
  { packageName: 'com.whatsapp', nome: 'WhatsApp', icone: 'data:image/png;base64,QQ==' },
];

describe('useAppBlockConfig', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useToast.mockReturnValue({ showToast });
    nativo.getInstalledApps.mockResolvedValue(APPS_MOCK);
    firestore.atualizarConfigBloqueioApps.mockResolvedValue(undefined);
  });

  it('sincroniza a config pro lado nativo no boot', async () => {
    firestore.buscarUsuario.mockResolvedValue({
      email: 'a@a.com',
      bloqueioApps: {
        ativo: true,
        appsSelecionados: ['com.whatsapp'],
        horarioInicio: '09:00',
        horarioFim: '18:00',
      },
    });

    const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(nativo.syncBloqueioConfig).toHaveBeenCalledWith({
      ativo: true,
      appsSelecionados: ['com.whatsapp'],
      horarioInicio: '09:00',
      horarioFim: '18:00',
    });
  });

  it('sem config salva: usa o padrão (inativo, nada selecionado, sem horário)', async () => {
    firestore.buscarUsuario.mockResolvedValue({ email: 'a@a.com' });

    const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.configAtual).toEqual({
      ativo: false,
      appsSelecionados: [],
      horarioInicio: null,
      horarioFim: null,
    });
    expect(result.current.appsInstalados).toEqual(APPS_MOCK);
  });

  it('carrega a config já salva quando existe', async () => {
    firestore.buscarUsuario.mockResolvedValue({
      email: 'a@a.com',
      bloqueioApps: {
        ativo: true,
        appsSelecionados: ['com.instagram.android'],
        horarioInicio: '09:00',
        horarioFim: '18:00',
      },
    });

    const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.configAtual.ativo).toBe(true);
    expect(result.current.configAtual.appsSelecionados).toEqual([
      'com.instagram.android',
    ]);
  });

  it('persistir mais recente não é sobrescrito por um carregar() mais antigo ainda em voo (race condition)', async () => {
    let resolverBuscarUsuario: (valor: unknown) => void = () => {};
    firestore.buscarUsuario.mockImplementation(
      () =>
        new Promise(resolve => {
          resolverBuscarUsuario = resolve;
        }),
    );

    const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
    // carregar() do mount fica em voo aqui, esperando buscarUsuario resolver.

    await act(async () => {
      await result.current.alternarAtivo(true);
    });

    expect(result.current.configAtual.ativo).toBe(true);

    // A leitura antiga finalmente resolve, com dado desatualizado (sem o
    // ativo:true que já foi gravado por persistir()).
    await act(async () => {
      resolverBuscarUsuario({
        email: 'a@a.com',
        bloqueioApps: {
          ativo: false,
          appsSelecionados: [],
          horarioInicio: null,
          horarioFim: null,
        },
      });
      await Promise.resolve();
    });

    // config local continua com o que persistir() gravou — não foi
    // sobrescrita pela leitura antiga que só resolveu depois.
    expect(result.current.configAtual.ativo).toBe(true);
    // E o SharedPreferences nativo também não foi ressincronizado com o
    // dado velho.
    expect(nativo.syncBloqueioConfig).not.toHaveBeenCalledWith(
      expect.objectContaining({ ativo: false }),
    );
  });

  describe('alternarApp', () => {
    it('adiciona o app à seleção e persiste a config inteira', async () => {
      firestore.buscarUsuario.mockResolvedValue({ email: 'a@a.com' });
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.alternarApp('com.instagram.android');
      });

      expect(result.current.configAtual.appsSelecionados).toEqual([
        'com.instagram.android',
      ]);
      expect(firestore.atualizarConfigBloqueioApps).toHaveBeenCalledWith(
        'uid-1',
        expect.objectContaining({
          appsSelecionados: ['com.instagram.android'],
        }),
      );
      expect(nativo.syncBloqueioConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          appsSelecionados: ['com.instagram.android'],
        }),
      );
    });

    it('remove o app quando já estava selecionado', async () => {
      firestore.buscarUsuario.mockResolvedValue({
        email: 'a@a.com',
        bloqueioApps: {
          ativo: false,
          appsSelecionados: ['com.instagram.android', 'com.whatsapp'],
          horarioInicio: null,
          horarioFim: null,
        },
      });
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.alternarApp('com.instagram.android');
      });

      expect(result.current.configAtual.appsSelecionados).toEqual([
        'com.whatsapp',
      ]);
    });

    it('reverte e mostra o toast quando a gravação falha', async () => {
      firestore.buscarUsuario.mockResolvedValue({ email: 'a@a.com' });
      firestore.atualizarConfigBloqueioApps.mockRejectedValueOnce(
        new Error('offline'),
      );
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.alternarApp('com.instagram.android');
      });

      expect(result.current.configAtual.appsSelecionados).toEqual([]);
      expect(showToast).toHaveBeenCalledWith(
        'Não conseguimos salvar essa seleção agora. Tente de novo.',
      );
      // Só a sincronia do boot — a escrita falhou, não sincroniza a config
      // errada pro lado nativo.
      expect(nativo.syncBloqueioConfig).toHaveBeenCalledTimes(1);
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useAppBlockConfig.persistir',
      );
    });
  });

  it('salvarHorario grava início e fim mantendo o resto da config', async () => {
    firestore.buscarUsuario.mockResolvedValue({
      email: 'a@a.com',
      bloqueioApps: {
        ativo: true,
        appsSelecionados: ['com.whatsapp'],
        horarioInicio: null,
        horarioFim: null,
      },
    });
    const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.salvarHorario('09:00', '18:00');
    });

    expect(result.current.configAtual).toMatchObject({
      ativo: true,
      appsSelecionados: ['com.whatsapp'],
      horarioInicio: '09:00',
      horarioFim: '18:00',
    });
    expect(firestore.atualizarConfigBloqueioApps).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ horarioInicio: '09:00', horarioFim: '18:00' }),
    );
  });

  it('alternarAtivo liga/desliga o bloqueio geral', async () => {
    firestore.buscarUsuario.mockResolvedValue({ email: 'a@a.com' });
    const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alternarAtivo(true);
    });

    expect(result.current.configAtual.ativo).toBe(true);
    expect(firestore.atualizarConfigBloqueioApps).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ ativo: true }),
    );
  });

  describe('ativoAgora', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    async function configurarComHorario(agora: string) {
      jest.setSystemTime(new Date(`2026-09-11T${agora}:00`));
      firestore.buscarUsuario.mockResolvedValue({
        email: 'a@a.com',
        bloqueioApps: {
          ativo: true,
          appsSelecionados: ['com.whatsapp'],
          horarioInicio: '09:00',
          horarioFim: '18:00',
        },
      });
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));
      return result;
    }

    it('true quando o horário atual está dentro da janela', async () => {
      const result = await configurarComHorario('12:00');
      expect(result.current.ativoAgora).toBe(true);
    });

    it('false antes do horário de início', async () => {
      const result = await configurarComHorario('08:00');
      expect(result.current.ativoAgora).toBe(false);
    });

    it('false depois do horário de fim', async () => {
      const result = await configurarComHorario('19:00');
      expect(result.current.ativoAgora).toBe(false);
    });

    it('false quando o bloqueio geral está desligado, mesmo dentro da janela', async () => {
      jest.setSystemTime(new Date('2026-09-11T12:00:00'));
      firestore.buscarUsuario.mockResolvedValue({
        email: 'a@a.com',
        bloqueioApps: {
          ativo: false,
          appsSelecionados: ['com.whatsapp'],
          horarioInicio: '09:00',
          horarioFim: '18:00',
        },
      });
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.ativoAgora).toBe(false);
    });
  });

  describe('recarregar', () => {
    it('refaz a mesma busca sob demanda, sem passar por carregando', async () => {
      firestore.buscarUsuario.mockResolvedValue({ email: 'a@a.com' });
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(nativo.getInstalledApps).toHaveBeenCalledTimes(1);

      firestore.buscarUsuario.mockResolvedValue({
        email: 'a@a.com',
        bloqueioApps: {
          ativo: true,
          appsSelecionados: ['com.whatsapp'],
          horarioInicio: '09:00',
          horarioFim: '18:00',
        },
      });

      await act(async () => {
        await result.current.recarregar();
      });

      expect(nativo.getInstalledApps).toHaveBeenCalledTimes(2);
      expect(result.current.carregando).toBe(false);
      expect(result.current.configAtual.ativo).toBe(true);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('com falha de rede dispara o toast de atualização', async () => {
      firestore.buscarUsuario.mockResolvedValue({ email: 'a@a.com' });
      const { result } = await renderHook(() => useAppBlockConfig('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      firestore.buscarUsuario.mockRejectedValueOnce(new Error('offline'));

      await act(async () => {
        await result.current.recarregar();
      });

      expect(showToast).toHaveBeenCalledWith(
        'Não conseguimos atualizar agora. Tente de novo.',
      );
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useAppBlockConfig.recarregar',
      );
    });
  });
});
