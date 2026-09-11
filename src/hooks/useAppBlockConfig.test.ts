import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAppBlockConfig } from './useAppBlockConfig';

jest.mock('../services/firestore');
jest.mock('../native/AccessibilityDetection');
jest.mock('./useToast');

const firestore = require('../services/firestore');
const nativo = require('../native/AccessibilityDetection');
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
    });
  });
});
