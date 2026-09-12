import { act, renderHook } from '@testing-library/react-native';
import { useDayDetail } from './useDayDetail';

jest.mock('../services/firestore');

const { buscarDailyLog } = require('../services/firestore');

// Data bem no passado — não depende de fake timers pra garantir "não é hoje
// nem futuro" (o cálculo exaustivo de status por data já é coberto em
// domain/progress.test.ts; aqui só interessa a integração do hook).
const DATA_PASSADA = '2020-01-10';

describe('useDayDetail', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('começa sem nenhum dia selecionado', async () => {
    const { result } = await renderHook(() => useDayDetail('uid-1'));

    expect(result.current.dataSelecionada).toBeNull();
    expect(result.current.tarefasDoDia).toEqual([]);
    expect(result.current.statusDoDia).toBeNull();
    expect(result.current.carregando).toBe(false);
  });

  it('buscarDia busca o dailyLog exato e expõe tarefas + status', async () => {
    buscarDailyLog.mockResolvedValue({
      data: DATA_PASSADA,
      tarefas: [
        { id: '1', titulo: 'Ler 5 páginas', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDayDetail('uid-1'));

    await act(async () => {
      await result.current.buscarDia(DATA_PASSADA);
    });

    expect(buscarDailyLog).toHaveBeenCalledWith('uid-1', DATA_PASSADA);
    expect(result.current.dataSelecionada).toBe(DATA_PASSADA);
    expect(result.current.tarefasDoDia).toEqual([
      { id: '1', titulo: 'Ler 5 páginas', essencial: true, concluida: true },
    ]);
    expect(result.current.statusDoDia).toBe('cumprido');
    expect(result.current.carregando).toBe(false);
  });

  it('fica carregando true durante a busca, e volta a false ao resolver', async () => {
    let resolverBusca: (valor: unknown) => void = () => {};
    buscarDailyLog.mockReturnValue(
      new Promise(resolve => {
        resolverBusca = resolve;
      }),
    );

    const { result } = await renderHook(() => useDayDetail('uid-1'));

    await act(async () => {
      // Sem await na chamada em si (senão ficaria pendurado esperando
      // buscarDailyLog resolver) — só act(async) precisa ser aguardado
      // pra React 19 flushar a atualização síncrona de carregando.
      result.current.buscarDia(DATA_PASSADA);
    });

    expect(result.current.carregando).toBe(true);

    await act(async () => {
      resolverBusca({
        data: DATA_PASSADA,
        tarefas: [],
        statusDia: 'nao_cumprido',
        escudoUsado: false,
      });
    });

    expect(result.current.carregando).toBe(false);
  });

  it('dia sem dailyLog (buscarDailyLog resolve null): tarefas vazias e status sem_registro', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDayDetail('uid-1'));

    await act(async () => {
      await result.current.buscarDia(DATA_PASSADA);
    });

    expect(result.current.tarefasDoDia).toEqual([]);
    expect(result.current.statusDoDia).toBe('sem_registro');
  });

  it('tocar noutro dia troca a seleção (só um painel por vez)', async () => {
    buscarDailyLog
      .mockResolvedValueOnce({
        data: '2020-01-10',
        tarefas: [{ id: '1', titulo: 'A', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      })
      .mockResolvedValueOnce({
        data: '2020-01-11',
        tarefas: [{ id: '2', titulo: 'B', essencial: true, concluida: false }],
        statusDia: 'nao_cumprido',
        escudoUsado: false,
      });

    const { result } = await renderHook(() => useDayDetail('uid-1'));

    await act(async () => {
      await result.current.buscarDia('2020-01-10');
    });
    expect(result.current.dataSelecionada).toBe('2020-01-10');

    await act(async () => {
      await result.current.buscarDia('2020-01-11');
    });

    expect(result.current.dataSelecionada).toBe('2020-01-11');
    expect(result.current.tarefasDoDia).toEqual([
      { id: '2', titulo: 'B', essencial: true, concluida: false },
    ]);
  });

  describe('limparSelecao', () => {
    it('fecha o painel, limpando seleção, tarefas e status', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [{ id: '1', titulo: 'A', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      const { result } = await renderHook(() => useDayDetail('uid-1'));

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });
      expect(result.current.dataSelecionada).not.toBeNull();

      await act(async () => {
        result.current.limparSelecao();
      });

      expect(result.current.dataSelecionada).toBeNull();
      expect(result.current.tarefasDoDia).toEqual([]);
      expect(result.current.statusDoDia).toBeNull();
    });
  });
});
