import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDesafios } from './useDesafios';

jest.mock('../services/firestore');
jest.mock('../services/analytics');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

// Mesmo padrão de useRecarregarAoFocar.test.tsx/useRecarregarAoReganharFoco.test.ts:
// montar = ganhar foco pela 1ª vez. Guarda o callback registrado pra o teste
// simular um SEGUNDO foco chamando-o de novo manualmente, sem precisar de um
// NavigationContainer de verdade.
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

const firestore = require('../services/firestore');
const { logDesafioConcluido } = require('../services/analytics');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const MSG_FALHA = 'Não conseguimos atualizar agora. Tente de novo.';

function diaCumprido(data: string) {
  return {
    data,
    tarefas: [{ id: 'e', titulo: 't', essencial: true, concluida: true }],
    statusDia: 'cumprido',
    escudoUsado: false,
  };
}

const SEMANAL_ATUAL = {
  id: 'essencial_todo_dia-2026-09-14',
  titulo: 'Cumpra sua essencial todo dia',
  tipo: 'essencial_todo_dia',
  periodo: 'semanal',
  dataInicio: '2026-09-14',
  dataFim: '2026-09-20',
  meta: 7,
  progresso: 0,
  status: 'ativo',
};
const MENSAL_ATUAL = {
  id: 'dias_ativos_20-2026-09-01',
  titulo: '20 dias ativos esse mês',
  tipo: 'dias_ativos_20',
  periodo: 'mensal',
  dataInicio: '2026-09-01',
  dataFim: '2026-09-30',
  meta: 20,
  progresso: 0,
  status: 'ativo',
};

describe('useDesafios', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    callbackDeFoco = null;
    // 2026-09-16 é quarta -> semana 2026-09-14..20 (ímpar: essencial_todo_dia),
    // mês 2026-09-01..30.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-16T12:00:00Z'));
    useToast.mockReturnValue({ showToast });
    firestore.buscarDesafiosAtivos.mockResolvedValue([]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([]);
    firestore.criarDesafio.mockResolvedValue(undefined);
    firestore.atualizarProgressoDesafio.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gera desafio semanal e mensal quando não existe nenhum pro período', async () => {
    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.criarDesafio).toHaveBeenCalledTimes(2);
    expect(firestore.criarDesafio).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({
        periodo: 'semanal',
        dataInicio: '2026-09-14',
        tipo: 'essencial_todo_dia',
      }),
    );
    expect(firestore.criarDesafio).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({
        periodo: 'mensal',
        dataInicio: '2026-09-01',
        tipo: 'dias_ativos_20',
      }),
    );
    expect(result.current.desafioSemanal?.tipo).toBe('essencial_todo_dia');
    expect(result.current.desafioMensal?.tipo).toBe('dias_ativos_20');
  });

  it('reaproveita o desafio existente quando ainda está no mesmo período', async () => {
    firestore.buscarDesafiosAtivos.mockResolvedValue([
      { ...SEMANAL_ATUAL, progresso: 3 },
      { ...MENSAL_ATUAL, progresso: 8 },
    ]);

    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.criarDesafio).not.toHaveBeenCalled();
    expect(result.current.desafioSemanal?.id).toBe(
      'essencial_todo_dia-2026-09-14',
    );
  });

  it('persiste o progresso recalculado quando ele muda', async () => {
    firestore.buscarDesafiosAtivos.mockResolvedValue([
      { ...SEMANAL_ATUAL, progresso: 0 },
      { ...MENSAL_ATUAL, progresso: 0 },
    ]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([
      diaCumprido('2026-09-14'),
      diaCumprido('2026-09-15'),
    ]);

    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
      'uid-1',
      'essencial_todo_dia-2026-09-14',
      2,
      'ativo',
    );
    expect(result.current.desafioSemanal?.progresso).toBe(2);
  });

  it('não persiste quando o progresso não mudou', async () => {
    firestore.buscarDesafiosAtivos.mockResolvedValue([
      { ...SEMANAL_ATUAL, progresso: 0 },
      { ...MENSAL_ATUAL, progresso: 0 },
    ]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([]);

    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).not.toHaveBeenCalled();
    expect(logDesafioConcluido).not.toHaveBeenCalled();
  });

  it('progresso atinge a meta: dispara logDesafioConcluido com o tipo do desafio', async () => {
    jest.setSystemTime(new Date('2026-09-20T12:00:00Z')); // último dia da mesma semana
    firestore.buscarDesafiosAtivos.mockResolvedValue([
      { ...SEMANAL_ATUAL, progresso: 0 },
      { ...MENSAL_ATUAL, progresso: 0 },
    ]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([
      diaCumprido('2026-09-14'),
      diaCumprido('2026-09-15'),
      diaCumprido('2026-09-16'),
      diaCumprido('2026-09-17'),
      diaCumprido('2026-09-18'),
      diaCumprido('2026-09-19'),
      diaCumprido('2026-09-20'),
    ]);

    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.desafioSemanal?.status).toBe('concluido');
    expect(logDesafioConcluido).toHaveBeenCalledWith('essencial_todo_dia');
    expect(logDesafioConcluido).toHaveBeenCalledTimes(1);
  });

  it('fecha desafio ativo de período já encerrado (expira) e gera o do período atual', async () => {
    firestore.buscarDesafiosAtivos.mockResolvedValue([
      {
        id: 'exercicio_3x-2026-09-07',
        titulo: 'Exercite-se 3x essa semana',
        tipo: 'exercicio_3x',
        periodo: 'semanal',
        dataInicio: '2026-09-07',
        dataFim: '2026-09-13',
        meta: 3,
        progresso: 1,
        status: 'ativo',
      },
    ]);

    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
      'uid-1',
      'exercicio_3x-2026-09-07',
      expect.any(Number),
      'expirado',
    );
    expect(firestore.criarDesafio).toHaveBeenCalledTimes(2);
    expect(logDesafioConcluido).not.toHaveBeenCalled();
  });

  it('fecha desafio ativo de período encerrado batendo a meta: dispara logDesafioConcluido', async () => {
    firestore.buscarDesafiosAtivos.mockResolvedValue([
      {
        id: 'exercicio_3x-2026-09-07',
        titulo: 'Exercite-se 3x essa semana',
        tipo: 'exercicio_3x',
        periodo: 'semanal',
        dataInicio: '2026-09-07',
        dataFim: '2026-09-13',
        meta: 3,
        progresso: 0,
        status: 'ativo',
      },
    ]);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValueOnce([
      {
        data: '2026-09-07',
        tarefas: [
          { id: 'e1', titulo: 'x', tipo: 'exercicio', concluida: true },
          { id: 'e2', titulo: 'x', tipo: 'exercicio', concluida: true },
          { id: 'e3', titulo: 'x', tipo: 'exercicio', concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      },
    ]);

    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
      'uid-1',
      'exercicio_3x-2026-09-07',
      3,
      'concluido',
    );
    expect(logDesafioConcluido).toHaveBeenCalledWith('exercicio_3x');
  });

  it('reganhar foco (depois do mount) recarrega os desafios', async () => {
    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(firestore.buscarDesafiosAtivos).toHaveBeenCalledTimes(1);

    await act(async () => {
      callbackDeFoco?.();
    });

    expect(firestore.buscarDesafiosAtivos).toHaveBeenCalledTimes(2);
  });

  it('não recarrega em duplicidade no mount inicial (1ª leitura só do useEffect, não do foco)', async () => {
    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(firestore.buscarDesafiosAtivos).toHaveBeenCalledTimes(1);
  });

  it('recarregar com falha de rede dispara o toast', async () => {
    const { result } = await renderHook(() => useDesafios('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    firestore.buscarDesafiosAtivos.mockRejectedValueOnce(new Error('offline'));

    await act(async () => {
      await result.current.recarregar();
    });

    expect(showToast).toHaveBeenCalledWith(MSG_FALHA);
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useDesafios.recarregar',
    );
  });
});
