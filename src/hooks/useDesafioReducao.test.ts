import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDesafioReducao } from './useDesafioReducao';

jest.mock('../services/firestore');
jest.mock('../services/analytics');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const firestore = require('../services/firestore');
const { useToast } = require('./useToast');
const showToast = jest.fn();

function logComUso(data: string, segundos: number) {
  return { data, usoApps: { 'com.instagram.android': { segundos, aberturas: 1 } } };
}

describe('useDesafioReducao', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
});
