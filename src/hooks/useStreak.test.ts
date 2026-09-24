import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useStreak } from './useStreak';

jest.mock('../services/firestore');
jest.mock('../services/analytics');
jest.mock('../services/crashlytics');
jest.mock('./useToast');
const firestoreService = require('../services/firestore');
const { logMarcoStreakAtingido } = require('../services/analytics');
const { registrarErro } = require('../services/crashlytics');
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
    // Sem isso, a chamada real de AppState.addEventListener quebra neste
    // ambiente de teste — os testes específicos de AppState abaixo
    // substituem por uma versão que captura o callback.
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
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

  it('usuário novo (ultimoDiaAtivo vazio): inicializa com hoje, sem penalizar nem consumir proteção', async () => {
    mockAgora('2026-09-08');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 0,
      diasTotaisAtivos: 0,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '',
    });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    // Não chega a olhar pro "dia anterior" — não existe um de verdade.
    expect(firestoreService.buscarDailyLog).not.toHaveBeenCalled();
    expect(result.current.streakAtual).toBe(0);
    expect(result.current.escudosDisponiveis).toBe(1);
    expect(result.current.statusDiaAnterior).toBeNull();
    expect(result.current.statusStreak).toBe('ativo');
    expect(firestoreService.atualizarEstadoStreak).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ ultimoDiaAtivo: '2026-09-08', streakAtual: 0 }),
    );
  });

  it('conta legada (ultimoDiaAtivo null vindo do Firestore): mesmo tratamento do usuário novo', async () => {
    mockAgora('2026-09-08');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 0,
      diasTotaisAtivos: 0,
      ultimoDiaAtivo: '',
    });

    const { result } = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.streakAtual).toBe(0);
    expect(firestoreService.atualizarEstadoStreak).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ ultimoDiaAtivo: '2026-09-08' }),
    );
  });

  it('sequência completa a partir de usuário novo: 3 dias cumpridos seguidos resultam em streakAtual > 0', async () => {
    // Dia 1 (2026-09-08): primeiro boot, ultimoDiaAtivo vazio -> só inicializa.
    mockAgora('2026-09-08');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 0,
      diasTotaisAtivos: 0,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '',
    });
    const dia1 = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(dia1.result.current.carregando).toBe(false));
    expect(dia1.result.current.streakAtual).toBe(0);

    // Dia 1 foi cumprido (usuário concluiu a essencial) — dailyLog real.
    const logDia1Cumprido = {
      data: '2026-09-08',
      tarefas: [{ id: '1', titulo: 'x', essencial: true, concluida: true }],
      statusDia: 'cumprido',
      escudoUsado: false,
    };

    // Dia 2 (2026-09-09): boot reavalia ontem (dia 1) como cumprido.
    mockAgora('2026-09-09');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 0,
      diasTotaisAtivos: 0,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '2026-09-08',
    });
    firestoreService.buscarDailyLog.mockResolvedValue(logDia1Cumprido);
    const dia2 = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(dia2.result.current.carregando).toBe(false));
    expect(dia2.result.current.streakAtual).toBe(1);
    expect(dia2.result.current.diasTotaisAtivos).toBe(1);

    // Dia 3 (2026-09-10): boot reavalia ontem (dia 2, também cumprido).
    const logDia2Cumprido = { ...logDia1Cumprido, data: '2026-09-09' };
    mockAgora('2026-09-10');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 1,
      diasTotaisAtivos: 1,
      escudosDisponiveis: 1,
      ultimoDiaAtivo: '2026-09-09',
    });
    firestoreService.buscarDailyLog.mockResolvedValue(logDia2Cumprido);
    const dia3 = await renderHook(() => useStreak('uid-1'));
    await waitFor(() => expect(dia3.result.current.carregando).toBe(false));

    expect(dia3.result.current.streakAtual).toBe(2);
    expect(dia3.result.current.diasTotaisAtivos).toBe(2);
    expect(dia3.result.current.streakAtual).toBeGreaterThan(0);
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
    // 4 -> 5 não cruza nenhum marco (3 já tinha sido cruzado antes).
    expect(logMarcoStreakAtingido).not.toHaveBeenCalled();
  });

  it('dia anterior cumprido cruzando um marco: dispara logMarcoStreakAtingido', async () => {
    mockAgora('2026-09-09');
    firestoreService.buscarEstadoStreak.mockResolvedValue({
      ...ESTADO_BASE,
      streakAtual: 2,
    });
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

    expect(result.current.streakAtual).toBe(3);
    expect(logMarcoStreakAtingido).toHaveBeenCalledWith(3);
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
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useStreak.recarregar',
    );
  });

  describe('AppState: volta do background', () => {
    function mockAppStateListener() {
      const ouvintes: Record<string, (estado: string) => void> = {};
      const addListener = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation(((evento: string, cb: (estado: string) => void) => {
          ouvintes[evento] = cb;
          return { remove: jest.fn() } as never;
        }) as never);
      return { ouvintes, addListener };
    }

    it('data local mudou: reganhar o primeiro plano reprocessa', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8, 23, 0, 0));
      const { ouvintes, addListener } = mockAppStateListener();

      try {
        firestoreService.buscarEstadoStreak.mockResolvedValue({
          ...ESTADO_BASE,
        });

        const { result } = await renderHook(() => useStreak('uid-1'));
        await waitFor(() => expect(result.current.carregando).toBe(false));
        expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(1);

        // Vira o dia local enquanto o app estava em background.
        jest.setSystemTime(new Date(2026, 8, 9, 0, 5, 0));

        await act(async () => {
          await ouvintes.change?.('active');
        });

        expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(2);
      } finally {
        addListener.mockRestore();
        jest.useRealTimers();
      }
    });

    it('mesma data local: reganhar o primeiro plano NÃO reprocessa', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8, 10, 0, 0));
      const { ouvintes, addListener } = mockAppStateListener();

      try {
        firestoreService.buscarEstadoStreak.mockResolvedValue({
          ...ESTADO_BASE,
        });

        const { result } = await renderHook(() => useStreak('uid-1'));
        await waitFor(() => expect(result.current.carregando).toBe(false));
        expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(1);

        jest.setSystemTime(new Date(2026, 8, 8, 15, 0, 0));

        await act(async () => {
          await ouvintes.change?.('active');
        });

        expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(1);
      } finally {
        addListener.mockRestore();
        jest.useRealTimers();
      }
    });

    it('ir pro background não dispara reprocessamento', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8, 10, 0, 0));
      const { ouvintes, addListener } = mockAppStateListener();

      try {
        firestoreService.buscarEstadoStreak.mockResolvedValue({
          ...ESTADO_BASE,
        });

        const { result } = await renderHook(() => useStreak('uid-1'));
        await waitFor(() => expect(result.current.carregando).toBe(false));
        expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(1);

        jest.setSystemTime(new Date(2026, 8, 9, 0, 5, 0));

        await act(async () => {
          await ouvintes.change?.('background');
        });

        expect(firestoreService.buscarEstadoStreak).toHaveBeenCalledTimes(1);
      } finally {
        addListener.mockRestore();
        jest.useRealTimers();
      }
    });
  });
});
