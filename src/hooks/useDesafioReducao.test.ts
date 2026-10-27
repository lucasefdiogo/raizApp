import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDesafioReducao } from './useDesafioReducao';
import { salvarItem } from '../utils/storage';

jest.mock('../services/firestore');
jest.mock('../services/analytics');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const firestore = require('../services/firestore');
const { useToast } = require('./useToast');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const showToast = jest.fn();

function logComUso(data: string, segundos: number) {
  return { data, usoApps: { 'com.instagram.android': { segundos, aberturas: 1 } } };
}

describe('useDesafioReducao', () => {
  beforeEach(async () => {
    // clearAllMocks (não resetAllMocks): resetAllMocks apagaria a
    // implementação real do mock manual de AsyncStorage (__mocks__/...),
    // que guarda estado em memória — sem ela, salvarItem/lerItem viram
    // no-op silencioso.
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T12:00:00Z')); // segunda
    useToast.mockReturnValue({ showToast });
    firestore.buscarUsuario.mockResolvedValue({
      consentimentoAcessoUso: '2026-01-01',
      regrasBloqueio: { apps: ['com.instagram.android'] },
    });
    firestore.buscarDesafiosAtivos.mockResolvedValue([]);
    firestore.buscarDesafio.mockResolvedValue(null);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => logComUso(`2026-10-${12 + i}`, 3600)), // 7h na semana anterior
    );
    firestore.criarDesafio.mockResolvedValue(undefined);
    firestore.atualizarProgressoDesafio.mockResolvedValue(undefined);
  });

  afterEach(() => jest.useRealTimers());

  it('com base acima de 1h, sem desafio ativo nem resposta prévia, monta a proposta', async () => {
    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    // 7 dias × 3600s = 25200s (7h) de base -> meta = floor(round(25200*0.9)/300)*300 = 22500s (6h15min).
    expect(result.current.proposta).toMatchObject({ titulo: 'Até 6h 15min nas redes' });
    expect(result.current.desafioAtivo).toBeNull();
  });

  it('com a reflexão não visível (reflexaoVisivel false), não propõe mesmo com base acima de 1h', async () => {
    const { result } = await renderHook(() => useDesafioReducao('uid-1', false));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.proposta).toBeNull();
  });

  it('aceitar cria o desafio da semana com a meta da proposta e some com a proposta', async () => {
    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.aceitar();
    });

    expect(firestore.criarDesafio).toHaveBeenCalledWith('uid-1', expect.objectContaining({
      id: 'reducao_tempo_redes-2026-10-19',
      tipo: 'reducao_tempo_redes',
      dataInicio: '2026-10-19',
      dataFim: '2026-10-25',
      meta: 22500,
      progresso: 0,
      status: 'ativo',
      baseSegundos: 25200,
    }));
    expect(result.current.proposta).toBeNull();
  });

  it('recusar grava a semana no AsyncStorage e some com a proposta sem criar desafio', async () => {
    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.recusar();
    });

    expect(firestore.criarDesafio).not.toHaveBeenCalled();
    expect(result.current.proposta).toBeNull();
  });

  it('um desafio de redução de duas semanas atrás, esquecido e ainda ativo, é fechado pelo carregamento', async () => {
    const desafioAntigo = {
      id: 'reducao_tempo_redes-2026-10-05',
      titulo: 'Até 3h nas redes esta semana',
      tipo: 'reducao_tempo_redes',
      periodo: 'semanal',
      dataInicio: '2026-10-05',
      dataFim: '2026-10-11',
      meta: 10800,
      progresso: 0,
      status: 'ativo',
    };
    firestore.buscarDesafiosAtivos.mockResolvedValue([desafioAntigo]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([logComUso('2026-10-05', 9000)]); // abaixo da meta

    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
      'uid-1', 'reducao_tempo_redes-2026-10-05', 9000, 'concluido',
    );
    expect(result.current.desafioAtivo).toBeNull();
  });

  it('sem acesso de uso, fecha um desafio esquecido como expirado mesmo com progresso congelado abaixo da meta', async () => {
    const desafioAntigo = {
      id: 'reducao_tempo_redes-2026-10-05',
      titulo: 'Até 3h nas redes esta semana',
      tipo: 'reducao_tempo_redes',
      periodo: 'semanal',
      dataInicio: '2026-10-05',
      dataFim: '2026-10-11',
      meta: 10800,
      progresso: 9000, // congelado — abaixo da meta, mas sem acesso de uso nunca fecha concluído.
      status: 'ativo',
    };
    firestore.buscarUsuario.mockResolvedValue({
      consentimentoAcessoUso: null,
      regrasBloqueio: { apps: ['com.instagram.android'] },
    });
    firestore.buscarDesafiosAtivos.mockResolvedValue([desafioAntigo]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([]);

    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
      'uid-1', 'reducao_tempo_redes-2026-10-05', 9000, 'expirado',
    );
  });

  it('lê o desafio da semana anterior só depois de fechá-lo — não antes, com o status velho', async () => {
    const desafioSemanaAnterior = {
      id: 'reducao_tempo_redes-2026-10-12',
      titulo: 'Até 3h nas redes esta semana',
      tipo: 'reducao_tempo_redes',
      periodo: 'semanal',
      dataInicio: '2026-10-12',
      dataFim: '2026-10-18',
      meta: 10800,
      progresso: 0,
      status: 'ativo',
    };
    firestore.buscarDesafiosAtivos.mockResolvedValue([desafioSemanaAnterior]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([logComUso('2026-10-12', 9000)]); // abaixo da meta
    // Simula o que um Firestore real leria depois do setDoc acima: já 'concluido'.
    firestore.buscarDesafio.mockResolvedValue({ ...desafioSemanaAnterior, status: 'concluido' });

    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(
      firestore.buscarDesafio.mock.invocationCallOrder[0],
    ).toBeGreaterThan(firestore.atualizarProgressoDesafio.mock.invocationCallOrder[0]);
    expect(result.current.resultadoAnteriorTexto).toBe(
      'Você fechou a semana passada dentro do combinado.',
    );
  });

  it('proposta já recusada nesta semana (AsyncStorage) não volta, mesmo com base acima de 1h', async () => {
    await salvarItem('desafio_reducao_proposta_recusada_em', '2026-10-19'); // segunda desta semana

    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.proposta).toBeNull();
  });

  it('com desafio de redução já ativo nesta semana, não mostra proposta e não escreve se o progresso não mudou', async () => {
    const desafioAtual = {
      id: 'reducao_tempo_redes-2026-10-19',
      titulo: 'Até 5h 40min nas redes esta semana',
      tipo: 'reducao_tempo_redes',
      periodo: 'semanal',
      dataInicio: '2026-10-19',
      dataFim: '2026-10-25',
      meta: 20400,
      progresso: 9000,
      status: 'ativo',
    };
    firestore.buscarDesafiosAtivos.mockResolvedValue([desafioAtual]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([logComUso('2026-10-19', 9000)]); // mesmo valor já gravado

    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.proposta).toBeNull();
    expect(result.current.desafioAtivo).toMatchObject({ progresso: 9000 });
    expect(firestore.atualizarProgressoDesafio).not.toHaveBeenCalled();
  });

  it('com desafio de redução já ativo nesta semana, escreve quando o progresso recalculado mudou', async () => {
    const desafioAtual = {
      id: 'reducao_tempo_redes-2026-10-19',
      titulo: 'Até 5h 40min nas redes esta semana',
      tipo: 'reducao_tempo_redes',
      periodo: 'semanal',
      dataInicio: '2026-10-19',
      dataFim: '2026-10-25',
      meta: 20400,
      progresso: 9000,
      status: 'ativo',
    };
    firestore.buscarDesafiosAtivos.mockResolvedValue([desafioAtual]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([logComUso('2026-10-19', 12000)]); // mudou

    const { result } = await renderHook(() => useDesafioReducao('uid-1', true));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
      'uid-1', 'reducao_tempo_redes-2026-10-19', 12000, 'ativo',
    );
    expect(result.current.desafioAtivo).toMatchObject({ progresso: 12000 });
  });
});
