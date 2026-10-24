import { act, renderHook } from '@testing-library/react-native';
import { useDayDetail } from './useDayDetail';

jest.mock('../services/firestore');

const firestoreMock = require('../services/firestore');
const { buscarDailyLog } = firestoreMock;

// Data bem no passado — não depende de fake timers pra garantir "não é hoje
// nem futuro" (o cálculo exaustivo de status por data já é coberto em
// domain/progress.test.ts; aqui só interessa a integração do hook).
const DATA_PASSADA = '2020-01-10';

describe('useDayDetail', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('começa sem nenhum dia selecionado', async () => {
    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

    expect(result.current.dataSelecionada).toBeNull();
    expect(result.current.tarefasDoDia).toEqual([]);
    expect(result.current.statusDoDia).toBeNull();
    expect(result.current.detalheRedes).toBeNull();
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

    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

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

    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

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

    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

    await act(async () => {
      await result.current.buscarDia(DATA_PASSADA);
    });

    expect(result.current.tarefasDoDia).toEqual([]);
    expect(result.current.statusDoDia).toBe('sem_registro');
  });

  it('buscarDia de hoje com tarefa essencial já concluída: status cumprido ao vivo (bate com a pastilha)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-23T12:00:00Z'));
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-23',
      tarefas: [
        { id: '1', titulo: 'Ler 5 páginas', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

    await act(async () => {
      await result.current.buscarDia('2026-09-23');
    });

    expect(result.current.statusDoDia).toBe('cumprido');
    jest.useRealTimers();
  });

  it('buscarDia de hoje sem cumprimento ainda: pendente, nunca perdido antes da virada', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-23T12:00:00Z'));
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-23',
      tarefas: [
        { id: '1', titulo: 'Ler 5 páginas', essencial: true, concluida: false },
      ],
      statusDia: 'pendente',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

    await act(async () => {
      await result.current.buscarDia('2026-09-23');
    });

    expect(result.current.statusDoDia).toBe('pendente');
    jest.useRealTimers();
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

    const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

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
    it('fecha o painel, limpando seleção, tarefas, status e detalheRedes', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [{ id: '1', titulo: 'A', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
        resumoBloqueio: { sessoesUsadas: 1, intencoes: [] },
      });

      const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });
      expect(result.current.dataSelecionada).not.toBeNull();
      expect(result.current.detalheRedes).not.toBeNull();

      await act(async () => {
        result.current.limparSelecao();
      });

      expect(result.current.dataSelecionada).toBeNull();
      expect(result.current.tarefasDoDia).toEqual([]);
      expect(result.current.statusDoDia).toBeNull();
      expect(result.current.detalheRedes).toBeNull();
    });
  });

  describe('HU-08 · detalheRedes (RN07)', () => {
    it('Cenário 9: dia sem resumoBloqueio nem usoApps não expõe o bloco', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
      });

      const { result } = await renderHook(() => useDayDetail('uid-1', true, []));

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });

      expect(result.current.detalheRedes).toBeNull();
    });

    it('dia com resumoBloqueio e usoApps, com acesso de uso: expõe duração e apps bloqueados', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
        resumoBloqueio: { sessoesUsadas: 4, intencoes: ['responder a turma'], acessosRapidos: 1 },
        usoApps: {
          'com.instagram.android': { segundos: 31 * 60, aberturas: 2 },
          'com.zhiliaoapp.musically': { segundos: 21 * 60, aberturas: 1 },
        },
      });

      const { result } = await renderHook(() =>
        useDayDetail('uid-1', true, ['com.instagram.android', 'com.zhiliaoapp.musically']),
      );

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });

      expect(result.current.detalheRedes?.duracao).toBe('52 min');
      expect(result.current.detalheRedes?.topAppsTexto).toBe('Instagram 31 min · TikTok 21 min');
      expect(result.current.detalheRedes?.textoContadores).toBe('4 sessões · 1 acesso rápido');
      expect(result.current.detalheRedes?.intencoes).toEqual(['responder a turma']);
    });

    it('HU-13: app com uso registrado mas desmarcado do bloqueio não entra na duração nem na lista', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
        resumoBloqueio: { sessoesUsadas: 1, intencoes: [] },
        usoApps: {
          'com.instagram.android': { segundos: 31 * 60, aberturas: 2 },
          'com.google.android.youtube': { segundos: 999 * 60, aberturas: 1 },
        },
      });

      const { result } = await renderHook(() =>
        useDayDetail('uid-1', true, ['com.instagram.android']),
      );

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });

      expect(result.current.detalheRedes?.duracao).toBe('31 min');
      expect(result.current.detalheRedes?.topAppsTexto).toBe('Instagram 31 min');
    });

    it('sem acesso de uso, não expõe duração nem apps mesmo com usoApps no log', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
        usoApps: { 'com.instagram.android': { segundos: 100, aberturas: 1 } },
      });

      const { result } = await renderHook(() => useDayDetail('uid-1', false, []));

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });

      expect(result.current.detalheRedes?.duracao).toBeNull();
      expect(result.current.detalheRedes?.topAppsTexto).toBeNull();
    });

    it('Cenário 14: abrir o detalhe do dia nunca escreve nada no Firestore', async () => {
      buscarDailyLog.mockResolvedValue({
        data: DATA_PASSADA,
        tarefas: [{ id: '1', titulo: 'A', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
        resumoBloqueio: { sessoesUsadas: 4, intencoes: ['oi'] },
        usoApps: { 'com.instagram.android': { segundos: 100, aberturas: 1 } },
      });

      const { result } = await renderHook(() =>
        useDayDetail('uid-1', true, ['com.instagram.android']),
      );

      await act(async () => {
        await result.current.buscarDia(DATA_PASSADA);
      });

      expect(firestoreMock.atualizarEstadoStreak).not.toHaveBeenCalled();
      expect(firestoreMock.atualizarStatusStreak).not.toHaveBeenCalled();
      expect(firestoreMock.salvarDailyLog).not.toHaveBeenCalled();
      expect(firestoreMock.gravarUsoAppsNoDia).not.toHaveBeenCalled();
      expect(firestoreMock.registrarResumoBloqueioNoDia).not.toHaveBeenCalled();
    });
  });
});
