import { AppState } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSincronizarAcessibilidade } from './useSincronizarAcessibilidade';
import { paraISOLocal } from '../domain/data';

jest.mock('../services/firestore');
jest.mock('../native/EventosAcessibilidade');
jest.mock('../services/crashlytics');

const { buscarUsuario, gravarAcessibilidadeNoDia } = require('../services/firestore');
const {
  lerEventosAcessibilidadePendentes,
  marcarEventosAcessibilidadeEnviados,
  verificarDesligamentoNaAbertura,
  espelharNotificacoesAtivas,
} = require('../native/EventosAcessibilidade');
const { registrarErro } = require('../services/crashlytics');

const OFF = '2026-10-19T10:00:00.000Z';
const ON = '2026-10-19T10:05:00.000Z';
const DIA = paraISOLocal(new Date(OFF));

function pendentes() {
  return [
    { id: 'e1', tipo: 'desligamento', em: OFF },
    { id: 'e2', tipo: 'religamento', em: ON },
  ];
}

describe('useSincronizarAcessibilidade', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((() => ({ remove: jest.fn() })) as never);
    buscarUsuario.mockResolvedValue({ notificacoesAtivas: true });
    verificarDesligamentoNaAbertura.mockResolvedValue(undefined);
    lerEventosAcessibilidadePendentes.mockResolvedValue(pendentes());
    gravarAcessibilidadeNoDia.mockResolvedValue(undefined);
    marcarEventosAcessibilidadeEnviados.mockResolvedValue(undefined);
  });

  it('CA-05: eventos pendentes são gravados por dia e marcados como enviados', async () => {
    await renderHook(() => useSincronizarAcessibilidade('uid-1'));

    await waitFor(() => expect(marcarEventosAcessibilidadeEnviados).toHaveBeenCalled());
    expect(gravarAcessibilidadeNoDia).toHaveBeenCalledWith('uid-1', DIA, {
      desligadoEm: [OFF],
      religadoEm: [ON],
    });
    expect(marcarEventosAcessibilidadeEnviados).toHaveBeenCalledWith(['e1', 'e2']);
  });

  it('CA-05: sem eventos pendentes nada é gravado numa abertura posterior', async () => {
    lerEventosAcessibilidadePendentes.mockResolvedValue([]);

    await renderHook(() => useSincronizarAcessibilidade('uid-1'));

    await waitFor(() => expect(lerEventosAcessibilidadePendentes).toHaveBeenCalled());
    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(gravarAcessibilidadeNoDia).not.toHaveBeenCalled();
    expect(marcarEventosAcessibilidadeEnviados).not.toHaveBeenCalled();
  });

  it('CA-07: a abertura pede a verificação de desligamento ao módulo nativo antes de ler os pendentes', async () => {
    await renderHook(() => useSincronizarAcessibilidade('uid-1'));

    await waitFor(() => expect(lerEventosAcessibilidadePendentes).toHaveBeenCalled());
    expect(verificarDesligamentoNaAbertura).toHaveBeenCalledTimes(1);
    expect(verificarDesligamentoNaAbertura.mock.invocationCallOrder[0]).toBeLessThan(
      lerEventosAcessibilidadePendentes.mock.invocationCallOrder[0],
    );
  });

  it('CA-06: a abertura espelha o valor atual de notificacoesAtivas no nativo', async () => {
    buscarUsuario.mockResolvedValue({ notificacoesAtivas: false });

    await renderHook(() => useSincronizarAcessibilidade('uid-1'));

    await waitFor(() => expect(espelharNotificacoesAtivas).toHaveBeenCalledWith(false));
  });

  it('CA-05: falha ao gravar não marca os eventos como enviados', async () => {
    const erro = new Error('firestore fora do ar');
    gravarAcessibilidadeNoDia.mockRejectedValue(erro);

    await renderHook(() => useSincronizarAcessibilidade('uid-1'));

    await waitFor(() => expect(registrarErro).toHaveBeenCalledWith(erro, 'useSincronizarAcessibilidade'));
    expect(marcarEventosAcessibilidadeEnviados).not.toHaveBeenCalled();
  });
});
