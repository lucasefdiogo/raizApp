import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useResumoRedes } from './useResumoRedes';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('./useToast');
const firestoreMock = require('../services/firestore');
const { buscarDailyLogsNoIntervalo, buscarUsuario } = firestoreMock;
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

let callbackDeFoco: (() => void) | null = null;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      callbackDeFoco = callback;
      return callback();
    }, [callback]);
  },
}));

const showToast = jest.fn();
const MSG_FALHA_RECARREGAR = 'Não conseguimos atualizar agora. Tente de novo.';

// Segunda-feira, mesma semana usada nos testes de domain/resumoRedes.
const HOJE = '2026-10-19T12:00:00Z';

function diasComUso(datas: string[]) {
  return datas.map(data => ({
    data,
    tarefas: [],
    statusDia: 'pendente' as const,
    escudoUsado: false,
    usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 1 } },
  }));
}

describe('HU-08 · useResumoRedes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    callbackDeFoco = null;
    jest.useFakeTimers().setSystemTime(new Date(HOJE));
    useToast.mockReturnValue({ showToast });
    buscarDailyLogsNoIntervalo.mockResolvedValue([]);
    buscarUsuario.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('busca o intervalo da segunda da semana anterior até hoje (RN01)', async () => {
    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(buscarDailyLogsNoIntervalo).toHaveBeenCalledWith(
      'uid-1',
      '2026-10-12',
      '2026-10-19',
    );
    expect(buscarUsuario).toHaveBeenCalledWith('uid-1');
  });

  it('Cenário 2/RN04: sem consentimentoAcessoUso, não expõe duração/barras mesmo com dados de uso', async () => {
    buscarUsuario.mockResolvedValue({ consentimentoAcessoUso: null });
    buscarDailyLogsNoIntervalo.mockResolvedValue(diasComUso(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']));

    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.resumoCard.duracaoTotal).toBe('');
    expect(result.current.resumoCard.barras).toEqual([]);
    expect(result.current.reflexao).toBeNull();
  });

  it('com consentimento e base de 4+ dias na semana anterior, expõe resumo e reflexão', async () => {
    buscarUsuario.mockResolvedValue({ consentimentoAcessoUso: '2026-01-01' });
    buscarDailyLogsNoIntervalo.mockResolvedValue(
      diasComUso(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-19']),
    );

    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.resumoCard.duracaoTotal).toBe('1h');
    expect(result.current.reflexao).not.toBeNull();
    expect(result.current.reflexao?.duracaoTotal).toBe('4h');
    expect(result.current.comAcessoDeUso).toBe(true);
  });

  it('recarregar() refaz a mesma busca sob demanda', async () => {
    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscarDailyLogsNoIntervalo).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.recarregar();
    });

    expect(buscarDailyLogsNoIntervalo).toHaveBeenCalledTimes(2);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('reganhar foco (depois do mount) recarrega', async () => {
    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscarDailyLogsNoIntervalo).toHaveBeenCalledTimes(1);

    await act(async () => {
      callbackDeFoco?.();
    });

    expect(buscarDailyLogsNoIntervalo).toHaveBeenCalledTimes(2);
  });

  it('Cenário 14: ler o resumo da semana nunca escreve nada no Firestore', async () => {
    buscarUsuario.mockResolvedValue({ consentimentoAcessoUso: '2026-01-01' });
    buscarDailyLogsNoIntervalo.mockResolvedValue(
      diasComUso(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-19']),
    );

    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestoreMock.atualizarEstadoStreak).not.toHaveBeenCalled();
    expect(firestoreMock.atualizarStatusStreak).not.toHaveBeenCalled();
    expect(firestoreMock.salvarDailyLog).not.toHaveBeenCalled();
    expect(firestoreMock.gravarUsoAppsNoDia).not.toHaveBeenCalled();
    expect(firestoreMock.registrarResumoBloqueioNoDia).not.toHaveBeenCalled();
  });

  it('recarregar() com falha de rede dispara o toast de atualização', async () => {
    const { result } = await renderHook(() => useResumoRedes('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    buscarDailyLogsNoIntervalo.mockRejectedValueOnce(new Error('offline'));

    await act(async () => {
      await result.current.recarregar();
    });

    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_RECARREGAR);
    expect(registrarErro).toHaveBeenCalledWith(expect.any(Error), 'useResumoRedes.recarregar');
  });
});
