import { renderHook, waitFor } from '@testing-library/react-native';
import { useProgressoSemanal } from './useProgressoSemanal';

jest.mock('../services/firestore');
const { buscarUltimosDailyLogs, buscarEstadoStreak } = require('../services/firestore');

describe('useProgressoSemanal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('busca os dailyLogs e o estado de streak, e encadeia com construirHistoricoSemana', async () => {
    buscarUltimosDailyLogs.mockResolvedValue([
      {
        data: '2026-09-13',
        tarefas: [
          { id: '1', titulo: 't', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      },
    ]);
    buscarEstadoStreak.mockResolvedValue({
      streakAtual: 6,
      diasTotaisAtivos: 20,
      escudosDisponiveis: 1,
      marcosAtingidos: [],
      ultimoDiaAtivo: '2026-09-13',
      statusStreak: 'ativo',
      dataUltimaRenovacaoEscudo: '2026-09-08',
    });

    const { result } = await renderHook(() => useProgressoSemanal('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(buscarUltimosDailyLogs).toHaveBeenCalledWith('uid-1', 7);
    expect(buscarEstadoStreak).toHaveBeenCalledWith('uid-1');
    expect(result.current.streakAtual).toBe(6);
    expect(result.current.diasTotaisAtivos).toBe(20);
    expect(result.current.historico).toHaveLength(7);

    const dia13 = result.current.historico.find(d => d.data === '2026-09-13');
    expect(dia13?.status).toBe('cumprido');

    const hoje = result.current.historico.find(d => d.data === '2026-09-14');
    expect(hoje?.status).toBe('pendente');
  });

  it('sem estado de streak (usuário sem documento): expõe 0 sem quebrar', async () => {
    buscarUltimosDailyLogs.mockResolvedValue([]);
    buscarEstadoStreak.mockResolvedValue(null);

    const { result } = await renderHook(() => useProgressoSemanal('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.streakAtual).toBe(0);
    expect(result.current.diasTotaisAtivos).toBe(0);
    expect(result.current.historico.every(dia => dia.status === 'sem_registro' || dia.status === 'pendente')).toBe(true);
  });
});
