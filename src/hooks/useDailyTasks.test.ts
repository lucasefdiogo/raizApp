import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDailyTasks } from './useDailyTasks';

jest.mock('../services/firestore');
const { buscarDailyLog, salvarDailyLog } = require('../services/firestore');

describe('useDailyTasks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    salvarDailyLog.mockResolvedValue(undefined);
  });

  it('sem dailyLog salvo ainda: começa com as tarefas padrão, sem escrever nada', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toHaveLength(3);
    expect(result.current.tarefas.every(t => !t.concluida)).toBe(true);
    expect(salvarDailyLog).not.toHaveBeenCalled();
  });

  it('com dailyLog já salvo: carrega o estado persistido em vez do padrão', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'Tarefa customizada', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toEqual([
      { id: '1', titulo: 'Tarefa customizada', essencial: true, concluida: true },
    ]);
    expect(result.current.statusDia).toBe('cumprido');
  });

  it('alternarTarefa atualiza o estado local e grava o dia inteiro no Firestore', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.tarefas.find(t => t.id === '1')?.concluida).toBe(true);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);

    const [uidChamado, dataChamada, logGravado] = salvarDailyLog.mock.calls[0];
    expect(uidChamado).toBe('uid-1');
    expect(dataChamada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(logGravado.tarefas.find((t: { id: string }) => t.id === '1').concluida).toBe(
      true,
    );
    expect(logGravado.statusDia).toBe('cumprido');
    expect(logGravado.escudoUsado).toBe(false);
  });

  it('preserva escudoUsado vindo do dailyLog carregado ao gravar um toggle', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'tarefa', essencial: true, concluida: false },
      ],
      statusDia: 'nao_cumprido',
      escudoUsado: true,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(logGravado.escudoUsado).toBe(true);
  });

  it('desmarcar uma tarefa concluída volta o statusDia pra nao_cumprido/pendente conforme o resto', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'tarefa', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.statusDia).toBe('pendente');
  });
});
