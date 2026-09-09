import { renderHook, waitFor } from '@testing-library/react-native';
import { useStreak } from './useStreak';

jest.mock('../services/firestore');
const firestoreService = require('../services/firestore');

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
});
