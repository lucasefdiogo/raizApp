import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDailyTasks } from './useDailyTasks';

jest.mock('../services/firestore');
jest.mock('./useToast');

const {
  buscarDailyLog,
  existeAlgumDailyLog,
  salvarDailyLog,
} = require('../services/firestore');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const MSG_FALHA_ALTERACAO = 'Não conseguimos salvar sua alteração. Tente de novo.';
const MSG_FALHA_ADICIONAR =
  'Não conseguimos adicionar a tarefa agora. Tente de novo.';

describe('useDailyTasks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    salvarDailyLog.mockResolvedValue(undefined);
    existeAlgumDailyLog.mockResolvedValue(false);
    useToast.mockReturnValue({ showToast });
  });

  it('primeiro dia de uso (nenhum dailyLog): semeia as tarefas de exemplo, sem escrever nada', async () => {
    buscarDailyLog.mockResolvedValue(null);
    existeAlgumDailyLog.mockResolvedValue(false);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toHaveLength(3);
    expect(result.current.tarefas.every(t => !t.concluida)).toBe(true);
    expect(salvarDailyLog).not.toHaveBeenCalled();
  });

  it('dia novo depois de já ter usado antes: começa vazio (não semeia de novo)', async () => {
    buscarDailyLog.mockResolvedValue(null);
    existeAlgumDailyLog.mockResolvedValue(true);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toEqual([]);
    expect(result.current.statusDia).toBe('pendente');
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

  it('alternarTarefa atualiza o estado local, grava o dia inteiro e não dispara toast', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.tarefas.find(t => t.id === '1')?.concluida).toBe(true);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();

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

  it('adicionarTarefa insere no estado local e grava o dia inteiro', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.adicionarTarefa('Revisar o capítulo 3', false);
    });

    expect(
      result.current.tarefas.some(t => t.titulo === 'Revisar o capítulo 3'),
    ).toBe(true);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(logGravado.tarefas).toHaveLength(4);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('adicionarTarefa essencial com 3 essenciais já no dia: dispara toast do limite e não grava', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'a', essencial: true, concluida: false },
        { id: '2', titulo: 'b', essencial: true, concluida: false },
        { id: '3', titulo: 'c', essencial: true, concluida: false },
      ],
      statusDia: 'pendente',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.limiteEssenciaisAtingido).toBe(true);

    await act(async () => {
      result.current.adicionarTarefa('Quarta essencial', true);
    });

    expect(showToast).toHaveBeenCalledWith(
      'Só dá pra marcar até 3 tarefas essenciais por dia',
    );
    expect(result.current.tarefas).toHaveLength(3);
    expect(salvarDailyLog).not.toHaveBeenCalled();
  });

  it('editarTarefa renomeia e grava o dia inteiro', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.editarTarefa('1', { titulo: 'Abrir o material por 2 minutos' });
    });

    expect(result.current.tarefas.find(t => t.id === '1')?.titulo).toBe(
      'Abrir o material por 2 minutos',
    );
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
  });

  it('escrita otimista: se salvarDailyLog falha, o estado volta ao anterior e dispara toast', async () => {
    buscarDailyLog.mockResolvedValue(null);
    salvarDailyLog.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const tarefasAntes = result.current.tarefas;

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.tarefas).toEqual(tarefasAntes);
    expect(result.current.tarefas.find(t => t.id === '1')?.concluida).toBe(false);
    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_ALTERACAO);
  });

  it('adicionarTarefa com falha de rede: reverte e dispara o toast de adicionar', async () => {
    buscarDailyLog.mockResolvedValue(null);
    salvarDailyLog.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const tarefasAntes = result.current.tarefas;

    await act(async () => {
      result.current.adicionarTarefa('Nova tarefa', false);
    });

    expect(result.current.tarefas).toEqual(tarefasAntes);
    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_ADICIONAR);
  });

  it('removerTarefa tira do estado local e grava o dia inteiro sem a tarefa', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.removerTarefa('2');
    });

    expect(result.current.tarefas.map(t => t.id)).toEqual(['1', '3']);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(logGravado.tarefas.map((t: { id: string }) => t.id)).toEqual(['1', '3']);
  });

  it('removerTarefa pode esvaziar o dia (statusDia volta a pendente)', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [{ id: '1', titulo: 'única', essencial: true, concluida: true }],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.removerTarefa('1');
    });

    expect(result.current.tarefas).toEqual([]);
    expect(result.current.statusDia).toBe('pendente');
  });
});
