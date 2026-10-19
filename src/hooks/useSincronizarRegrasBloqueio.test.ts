import { renderHook, waitFor } from '@testing-library/react-native';
import { useSincronizarRegrasBloqueio } from './useSincronizarRegrasBloqueio';
import { hojeISOLocal } from '../domain/data';

jest.mock('../services/firestore');
jest.mock('../native/AccessibilityDetection');
jest.mock('../services/crashlytics');

const {
  buscarUsuario,
  promoverRegrasBloqueioPendentes,
  salvarRegrasBloqueioImediatas,
  salvarRegrasBloqueioPendentes: salvarRegrasBloqueioPendentesFirestore,
} = require('../services/firestore');
const {
  salvarRegrasBloqueio: salvarRegrasBloqueioNativo,
  salvarRegrasBloqueioPendentes: salvarRegrasBloqueioPendentesNativo,
} = require('../native/AccessibilityDetection');
const { registrarErro } = require('../services/crashlytics');

// Só apps da lista curada: o hook agora limpa o que estiver fora dela (HU-01).
const VIGENTE = { apps: ['com.instagram.android'], janelas: [] };

describe('useSincronizarRegrasBloqueio', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    promoverRegrasBloqueioPendentes.mockResolvedValue(undefined);
    salvarRegrasBloqueioImediatas.mockResolvedValue(undefined);
    salvarRegrasBloqueioPendentesFirestore.mockResolvedValue(undefined);
  });

  it('sem regrasBloqueio configurado: não mexe em nada', async () => {
    buscarUsuario.mockResolvedValue({ regrasBloqueio: undefined, regrasBloqueioPendentes: null });

    await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(salvarRegrasBloqueioNativo).not.toHaveBeenCalled();
    expect(promoverRegrasBloqueioPendentes).not.toHaveBeenCalled();
  });

  it('sem pendência: só espelha a vigente no nativo', async () => {
    buscarUsuario.mockResolvedValue({ regrasBloqueio: VIGENTE, regrasBloqueioPendentes: null });

    await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

    await waitFor(() => expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith(VIGENTE));
    expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(null);
    expect(promoverRegrasBloqueioPendentes).not.toHaveBeenCalled();
  });

  it('pendência ainda não vencida: espelha os dois, não promove no Firestore', async () => {
    const pendente = { apps: [], janelas: [], efetivaEm: '2099-01-01' };
    buscarUsuario.mockResolvedValue({ regrasBloqueio: VIGENTE, regrasBloqueioPendentes: pendente });

    await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

    await waitFor(() => expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith(VIGENTE));
    expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(pendente);
    expect(promoverRegrasBloqueioPendentes).not.toHaveBeenCalled();
  });

  it('pendência já vencida: promove, espelha a nova vigente e persiste no Firestore', async () => {
    const pendente = { apps: ['com.instagram.android'], janelas: [], efetivaEm: hojeISOLocal() };
    buscarUsuario.mockResolvedValue({ regrasBloqueio: VIGENTE, regrasBloqueioPendentes: pendente });

    await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

    await waitFor(() =>
      expect(promoverRegrasBloqueioPendentes).toHaveBeenCalledWith('uid-1', {
        apps: pendente.apps,
        janelas: pendente.janelas,
      }),
    );
    expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith({
      apps: pendente.apps,
      janelas: pendente.janelas,
    });
    expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(null);
  });

  it('falha ao buscar usuário: registra erro e não lança', async () => {
    buscarUsuario.mockRejectedValue(new Error('offline'));

    await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

    await waitFor(() =>
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useSincronizarRegrasBloqueio',
      ),
    );
  });
  describe('limpeza de apps fora da lista curada (HU-01)', () => {
    const INSTAGRAM = 'com.instagram.android';
    const CHROME = 'com.android.chrome';

    it('CA-05: grava regra limpa, não cria pendência e sincroniza o serviço de acessibilidade', async () => {
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: [INSTAGRAM, CHROME], janelas: [] },
        regrasBloqueioPendentes: null,
      });

      await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

      const limpa = { apps: [INSTAGRAM], janelas: [] };
      await waitFor(() => expect(salvarRegrasBloqueioImediatas).toHaveBeenCalledWith('uid-1', limpa));
      expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith(limpa);
      expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(null);
      expect(salvarRegrasBloqueioPendentesFirestore).not.toHaveBeenCalled();
      expect(promoverRegrasBloqueioPendentes).not.toHaveBeenCalled();
    });

    it('CA-05: limpa também a pendente e espelha as duas cópias limpas no nativo', async () => {
      const pendente = { apps: [INSTAGRAM, CHROME], janelas: [], efetivaEm: '2099-01-01' };
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: [INSTAGRAM, CHROME], janelas: [] },
        regrasBloqueioPendentes: pendente,
      });

      await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

      const pendenteLimpa = { ...pendente, apps: [INSTAGRAM] };
      await waitFor(() =>
        expect(salvarRegrasBloqueioPendentesFirestore).toHaveBeenCalledWith('uid-1', pendenteLimpa),
      );
      expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith({ apps: [INSTAGRAM], janelas: [] });
      expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(pendenteLimpa);
    });

    it('CA-05: pendente com app fora da lista já promovida pelo nativo: promove, limpa e só então espelha', async () => {
      // O nativo promoveu com o app fechado, mas o Firestore ainda guarda a pendente vencida.
      const pendente = { apps: [INSTAGRAM, CHROME], janelas: [], efetivaEm: hojeISOLocal() };
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: [INSTAGRAM], janelas: [] },
        regrasBloqueioPendentes: pendente,
      });

      await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

      const limpa = { apps: [INSTAGRAM], janelas: [] };
      await waitFor(() =>
        expect(promoverRegrasBloqueioPendentes).toHaveBeenCalledWith('uid-1', limpa),
      );
      expect(salvarRegrasBloqueioNativo).toHaveBeenCalledWith(limpa);
      expect(salvarRegrasBloqueioPendentesNativo).toHaveBeenCalledWith(null);
      // Nada com o app fora da lista chega ao nativo nem vira pendência.
      for (const [regras] of salvarRegrasBloqueioNativo.mock.calls) {
        expect(regras.apps).not.toContain(CHROME);
      }
      expect(salvarRegrasBloqueioImediatas).not.toHaveBeenCalled();
      expect(salvarRegrasBloqueioPendentesFirestore).not.toHaveBeenCalled();
    });

    it('CA-05: regra já limpa não grava nada no Firestore', async () => {
      buscarUsuario.mockResolvedValue({
        regrasBloqueio: { apps: [INSTAGRAM], janelas: [] },
        regrasBloqueioPendentes: null,
      });

      await renderHook(() => useSincronizarRegrasBloqueio('uid-1'));

      await waitFor(() => expect(salvarRegrasBloqueioNativo).toHaveBeenCalled());
      expect(salvarRegrasBloqueioImediatas).not.toHaveBeenCalled();
      expect(salvarRegrasBloqueioPendentesFirestore).not.toHaveBeenCalled();
    });
  });
});
