import { renderHook, waitFor } from '@testing-library/react-native';
import { useColetaUsoApps } from './useColetaUsoApps';
import { hojeISOLocal } from '../domain/data';

jest.mock('../services/firestore');
jest.mock('../native/UsoApps');
jest.mock('../services/crashlytics');

const { buscarUsuario, gravarUsoAppsNoDia } = require('../services/firestore');
const { temAcessoUso, lerEventosUso } = require('../native/UsoApps');
const { registrarErro } = require('../services/crashlytics');

const INSTAGRAM = 'com.instagram.android';

function eventosDeHoje() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 10).getTime();
  const fim = inicio + 20 * 60 * 1000;
  return [
    { pacote: INSTAGRAM, classe: 'Main', tipo: 'primeiro_plano', ts: inicio },
    { pacote: INSTAGRAM, classe: 'Main', tipo: 'segundo_plano', ts: fim },
  ];
}

describe('useColetaUsoApps', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    gravarUsoAppsNoDia.mockResolvedValue(undefined);
    buscarUsuario.mockResolvedValue({ consentimentoAcessoUso: '2026-10-01' });
    temAcessoUso.mockResolvedValue(true);
    lerEventosUso.mockResolvedValue(eventosDeHoje());
  });

  it('CA-01: com acesso e consentimento a coleta grava usoApps do Instagram de hoje', async () => {
    await renderHook(() => useColetaUsoApps('uid-1'));

    await waitFor(() =>
      expect(gravarUsoAppsNoDia).toHaveBeenCalledWith('uid-1', hojeISOLocal(), {
        [INSTAGRAM]: { segundos: 1200, aberturas: 1 },
      }),
    );
  });

  it('CA-01: lê a janela dos últimos 7 dias (hoje e os 6 anteriores)', async () => {
    await renderHook(() => useColetaUsoApps('uid-1'));

    await waitFor(() => expect(lerEventosUso).toHaveBeenCalled());
    const [inicioMs, fimMs] = lerEventosUso.mock.calls[0];
    const hoje = new Date();
    const esperado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6).getTime();
    expect(inicioMs).toBe(esperado);
    expect(fimMs).toBeGreaterThanOrEqual(hoje.getTime() - 5000);
  });

  it('CA-03: coletar de novo sem uso novo grava os mesmos valores', async () => {
    await renderHook(() => useColetaUsoApps('uid-1'));
    await waitFor(() => expect(gravarUsoAppsNoDia).toHaveBeenCalledTimes(1));
    await renderHook(() => useColetaUsoApps('uid-1'));
    await waitFor(() => expect(gravarUsoAppsNoDia).toHaveBeenCalledTimes(2));

    expect(gravarUsoAppsNoDia.mock.calls[1]).toEqual(gravarUsoAppsNoDia.mock.calls[0]);
  });

  it('CA-06: sem acesso de uso concedido a coleta não grava nada', async () => {
    temAcessoUso.mockResolvedValue(false);

    await renderHook(() => useColetaUsoApps('uid-1'));

    await waitFor(() => expect(temAcessoUso).toHaveBeenCalled());
    expect(lerEventosUso).not.toHaveBeenCalled();
    expect(gravarUsoAppsNoDia).not.toHaveBeenCalled();
  });

  it('CA-06: sem consentimentoAcessoUso a coleta não grava nada', async () => {
    buscarUsuario.mockResolvedValue({ consentimentoAcessoUso: undefined });

    await renderHook(() => useColetaUsoApps('uid-1'));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(lerEventosUso).not.toHaveBeenCalled();
    expect(gravarUsoAppsNoDia).not.toHaveBeenCalled();
  });

  it('CA-06: falha na coleta é registrada e não propaga', async () => {
    lerEventosUso.mockRejectedValue(new Error('boom'));

    await renderHook(() => useColetaUsoApps('uid-1'));

    await waitFor(() => expect(registrarErro).toHaveBeenCalled());
    expect(gravarUsoAppsNoDia).not.toHaveBeenCalled();
  });
});
