import { renderHook, waitFor } from '@testing-library/react-native';
import { useSincronizarRegrasBloqueio } from './useSincronizarRegrasBloqueio';
import { hojeISOLocal } from '../domain/data';

jest.mock('../services/firestore');
jest.mock('../native/AccessibilityDetection');
jest.mock('../services/crashlytics');

const { buscarUsuario, promoverRegrasBloqueioPendentes } = require('../services/firestore');
const {
  salvarRegrasBloqueio: salvarRegrasBloqueioNativo,
  salvarRegrasBloqueioPendentes: salvarRegrasBloqueioPendentesNativo,
} = require('../native/AccessibilityDetection');
const { registrarErro } = require('../services/crashlytics');

const VIGENTE = { apps: ['com.whatsapp'], janelas: [] };

describe('useSincronizarRegrasBloqueio', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    promoverRegrasBloqueioPendentes.mockResolvedValue(undefined);
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
});
