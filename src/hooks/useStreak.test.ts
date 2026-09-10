import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useStreak } from './useStreak';

jest.mock('../services/firestore');
jest.mock('./useToast');
const firestoreService = require('../services/firestore');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const MSG_FALHA_RECARREGAR = 'Não conseguimos atualizar agora. Tente de novo.';

const ESTADO_BASE = {
  streakAtual: 4,
  diasTotaisAtivos: 10,
  escudosDisponiveis: 1,
  marcosAtingidos: [] as number[],
  ultimoDiaAtivo: '2026-09-08',
  statusStreak: 'ativo' as const,
  dataUltimaRenovacaoEscudo: '2026-09-08',
};

function mockAgora(dataISO: string) {
  jest.useFakeTimers().setSystemTime(new Date(`${dataISO}T12:00:00Z`));
}

describe('useStreak', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
    firestoreService.buscarDailyLog.mockResolvedValue(null);
    firestoreService.atualizarEstadoStreak.mockResolvedValue(undefined);
    useToast.mockReturnValue({ showToast });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uid nulo: não consulta o Firestore e resolve carregando=false', async () => {
    const { result } = await renderHook(() => useStreak(null));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestoreService.buscarEstadoStreak).not.toHaveBeenCalled();
    expect(result.current.streakAtual).toBe(0);
  });

  it('sem documento de usuário: não quebra e resolve carregando=false', async () => {
    firestoreService.buscarEstadoStreak.mockResolvedValue(null);

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestoreService.atualizarEstadoStreak).not.toHaveBeenCalled();
  });

  it('mesmo dia (ultimoDiaAtivo == hoje): não reavalia nenhum dia anterior', async () => {
    mockAgora('2026-09-08');
    firestoreService.buscarEstadoStreak.mockResolvedValue({ ...ESTADO_BASE });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestoreService.buscarDailyLog).not.toHaveBeenCalled();
    expect(result.current.statusDiaAnterior).toBeNull();
    expect(result.current.streakAtual).toBe(4);
  });

  it('dia anterior cumprido: incrementa o streak e escreve o resultado no Firestore', async () => {
    mockAgora('2026-09-09');
    firestoreService.buscarEstadoStreak.mockResolvedValue({ ...ESTADO_BASE });
    firestoreService.buscarDailyLog.mockResolvedValue({
      data: '2026-09-08',
      tarefas: [
        { id: '1', titulo: 'tarefa', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.streakAtual).toBe(5);
    expect(result.current.diasTotaisAtivos).toBe(11);
    expect(result.current.statusDiaAnterior).toBe('cumprido');
    expect(firestoreService.atualizarEstadoStreak).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ streakAtual: 5, ultimoDiaAtivo: '2026-09-09' }),
    );
  });

  it('dia anterior sem log (nenhuma tarefa registrada) conta como não cumprido', async () => {
    mockAgora('2026-09-09');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      escudosDisponiveis: 1,
    });
    firestoreService.buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.statusDiaAnterior).toBe('protegido_escudo');
    expect(result.current.escudosDisponiveis).toBe(0);
  });

  it('2+ dias seguidos sem atividade: statusStreak vira pausado, e NÃO expõe statusDiaAnterior (evita disputar com a tela de recaída de 1 dia)', async () => {
    mockAgora('2026-09-12'); // gap de 4 dias desde ultimoDiaAtivo (2026-09-08)
    firestoreService.buscarEstadoStreak.mockResolvedValue({ ...ESTADO_BASE });
    firestoreService.buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.statusStreak).toBe('pausado');
    expect(result.current.statusDiaAnterior).toBeNull();
    expect(firestoreService.atualizarEstadoStreak).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ statusStreak: 'pausado' }),
    );
  });

  it('marcarRetornoConcluido reverte statusStreak para ativo localmente', async () => {
    mockAgora('2026-09-12');
    firestoreService.buscarEstadoStreak.mockResolvedValue({ ...ESTADO_BASE });
    firestoreService.buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.statusStreak).toBe('pausado'));

    await act(async () => {
      result.current.marcarRetornoConcluido();
    });

    expect(result.current.statusStreak).toBe('ativo');
  });

  it('renova o escudo quando a última renovação foi em semana anterior', async () => {
    mockAgora('2026-09-08'); // mesmo dia de ultimoDiaAtivo: não avalia dia anterior
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      escudosDisponiveis: 0,
      dataUltimaRenovacaoEscudo: '2026-08-25',
    });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.escudosDisponiveis).toBe(1);
    expect(firestoreService.atualizarEstadoStreak).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ escudosDisponiveis: 1 }),
    );
  });

  it('recarregar() reprocessa a leitura do estado de streak sob demanda, sem voltar a carregando', async () => {
    mockAgora('2026-09-08'); // mesmo dia de ultimoDiaAtivo: não reavalia dia anterior
    firestoreService.buscarEstadoStreak.mockResolvedValue({ ...ESTADO_BASE });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(1);

    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 8,
      diasTotaisAtivos: 40,
    });

    await act(async () => {
      await result.current.recarregar();
    });

    expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(2);
    expect(result.current.carregando).toBe(false);
    expect(result.current.streakAtual).toBe(8);
    expect(result.current.diasTotaisAtivos).toBe(40);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('recarregar() com falha de rede dispara o toast de atualização', async () => {
    mockAgora('2026-09-08');
    firestoreService.buscarEstadoStreak.mockResolvedValueOnce({ ...ESTADO_BASE });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    firestoreService.buscarEstadoStreak.mockRejectedValueOnce(
      new Error('offline'),
    );

    await act(async () => {
      await result.current.recarregar();
    });

    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_RECARREGAR);
  });
});
