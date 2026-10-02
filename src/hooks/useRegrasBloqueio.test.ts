import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRegrasBloqueio } from './useRegrasBloqueio';

jest.mock('../services/firestore');
jest.mock('../native/AccessibilityDetection');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const {
  buscarUsuario,
  salvarRegrasBloqueioImediatas,
  salvarRegrasBloqueioPendentes: salvarRegrasBloqueioPendentesFirestore,
  cancelarRegrasBloqueioPendentes,
} = require('../services/firestore');
const {
  listarAppsInstalados,
  salvarRegrasBloqueio: salvarRegrasBloqueioNativo,
  salvarRegrasBloqueioPendentes: salvarRegrasBloqueioPendentesNativo,
} = require('../native/AccessibilityDetection');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const APPS_INSTALADOS = [
  { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'abc' },
];

const JANELA = { inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] };

describe('useRegrasBloqueio', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    listarAppsInstalados.mockResolvedValue(APPS_INSTALADOS);
    salvarRegrasBloqueioImediatas.mockResolvedValue(undefined);
    salvarRegrasBloqueioPendentesFirestore.mockResolvedValue(undefined);
    cancelarRegrasBloqueioPendentes.mockResolvedValue(undefined);
    useToast.mockReturnValue({ showToast });
  });

  it('carrega regrasVigentes/regrasPendentes/appsInstalados', async () => {
    buscarUsuario.mockResolvedValue({
      regrasBloqueio: { apps: ['com.instagram.android'], janelas: [JANELA] },
      regrasBloqueioPendentes: null,
    });

    const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.regrasVigentes).toEqual({
      apps: ['com.instagram.android'],
      janelas: [JANELA],
    });
    expect(result.current.regrasPendentes).toBeNull();
    expect(result.current.appsInstalados).toEqual(APPS_INSTALADOS);
  });

  it('ordena appsInstalados por nome, alfabético, ignorando acento/maiúscula', async () => {
    buscarUsuario.mockResolvedValue({ regrasBloqueio: undefined, regrasBloqueioPendentes: null });
    listarAppsInstalados.mockResolvedValue([
      { packageName: 'com.whatsapp', nome: 'WhatsApp', iconeBase64: 'c' },
      { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'a' },
      { packageName: 'com.etsy', nome: 'Ética', iconeBase64: 'd' },
      { packageName: 'com.tiktok', nome: 'TikTok', iconeBase64: 'b' },
    ]);

    const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.appsInstalados.map(app => app.nome)).toEqual([
      'Ética',
      'Instagram',
      'TikTok',
      'WhatsApp',
    ]);
  });

  it('sem usuário configurado ainda: regrasVigentes fica undefined', async () => {
    buscarUsuario.mockResolvedValue(null);

    const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.regrasVigentes).toBeUndefined();
    expect(result.current.regrasPendentes).toBeNull();
  });

  describe('salvar', () => {
    it('primeira configuração (sem regrasBloqueio ainda): grava imediata e espelha no nativo', async () => {
      buscarUsuario.mockResolvedValue({ regrasBloqueio: undefined, regrasBloqueioPendentes: null });
      const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      let sucesso: boolean | undefined;
      await act(async () => {
        sucesso = await result.current.salvar(['com.instagram.android'], JANELA);
      });

      expect(sucesso).toBe(true);
      expect(salvarRegrasBloqueioImediatas).toHaveBeenCalledWith('uid-1', {
        apps: ['com.instagram.android'],
        janelas: [JANELA],
      });
      expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith({
        apps: ['com.instagram.android'],
        janelas: [JANELA],
      });
      expect(salvarRegrasBloqueioPendentesFirestore).not.toHaveBeenCalled();
      expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(null);
      expect(showToast).toHaveBeenCalledWith('Regras de bloqueio salvas.');
      expect(result.current.regrasVigentes).toEqual({
        apps: ['com.instagram.android'],
        janelas: [JANELA],
      });
    });

    it('já existe regrasBloqueio: grava como pendente pra amanhã e avisa', async () => {
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: ['com.whatsapp'], janelas: [] },
        regrasBloqueioPendentes: null,
      });
      const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.salvar(['com.instagram.android'], JANELA);
      });

      expect(salvarRegrasBloqueioImediatas).not.toHaveBeenCalled();
      expect(salvarRegrasBloqueioPendentesFirestore).toHaveBeenCalledWith(
        'uid-1',
        expect.objectContaining({ apps: ['com.instagram.android'], janelas: [JANELA] }),
      );
      expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Anotado. A nova regra começa amanhã.');
      expect(result.current.regrasPendentes).not.toBeNull();
    });

    it('desativar (apps vazio) com regra já existente também vira pendente', async () => {
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: ['com.whatsapp'], janelas: [JANELA] },
        regrasBloqueioPendentes: null,
      });
      const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.salvar([], null);
      });

      expect(salvarRegrasBloqueioPendentesFirestore).toHaveBeenCalledWith(
        'uid-1',
        expect.objectContaining({ apps: [], janelas: [] }),
      );
    });

    it('falha ao salvar: registra erro, mostra toast e resolve false sem mudar o estado local', async () => {
      buscarUsuario.mockResolvedValue({ regrasBloqueio: undefined, regrasBloqueioPendentes: null });
      salvarRegrasBloqueioImediatas.mockRejectedValueOnce(new Error('offline'));
      const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      let sucesso: boolean | undefined;
      await act(async () => {
        sucesso = await result.current.salvar(['com.instagram.android'], JANELA);
      });

      expect(sucesso).toBe(false);
      expect(registrarErro).toHaveBeenCalledWith(expect.any(Error), 'useRegrasBloqueio.salvar');
      expect(showToast).toHaveBeenCalledWith('Não conseguimos salvar as regras agora. Tente de novo.');
      expect(result.current.regrasVigentes).toBeUndefined();
    });
  });

  describe('cancelarAlteracaoPendente', () => {
    it('apaga a pendência no Firestore e no nativo, e limpa o estado local', async () => {
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: ['com.whatsapp'], janelas: [] },
        regrasBloqueioPendentes: { apps: [], janelas: [], efetivaEm: '2026-09-25' },
      });
      const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.regrasPendentes).not.toBeNull();

      await act(async () => {
        await result.current.cancelarAlteracaoPendente();
      });

      expect(cancelarRegrasBloqueioPendentes).toHaveBeenCalledWith('uid-1');
      expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(null);
      expect(result.current.regrasPendentes).toBeNull();
    });

    it('falha ao cancelar: registra erro e mostra toast', async () => {
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: ['com.whatsapp'], janelas: [] },
        regrasBloqueioPendentes: { apps: [], janelas: [], efetivaEm: '2026-09-25' },
      });
      cancelarRegrasBloqueioPendentes.mockRejectedValueOnce(new Error('offline'));
      const { result } = await renderHook(() => useRegrasBloqueio('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.cancelarAlteracaoPendente();
      });

      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useRegrasBloqueio.cancelarAlteracaoPendente',
      );
      expect(showToast).toHaveBeenCalledWith(
        'Não conseguimos cancelar a alteração agora. Tente de novo.',
      );
      expect(result.current.regrasPendentes).not.toBeNull();
    });
  });
});
