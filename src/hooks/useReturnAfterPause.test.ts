import { renderHook, waitFor } from '@testing-library/react-native';
import { useReturnAfterPause } from './useReturnAfterPause';

jest.mock('../services/firestore');
const {
  buscarUsuario,
  buscarSystemMessage,
  adicionarTarefaAoDailyLog,
  atualizarStatusStreak,
} = require('../services/firestore');

describe('useReturnAfterPause', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    adicionarTarefaAoDailyLog.mockResolvedValue(undefined);
    atualizarStatusStreak.mockResolvedValue(undefined);
  });

  it('expõe porqueTexto e substitui {{porqueTexto}} no corpo vindo de systemMessages/retorno_pausa', async () => {
    buscarUsuario.mockResolvedValue({ porqueTexto: 'Terminar meus estudos' });
    buscarSystemMessage.mockResolvedValue({
      titulo: 'De volta',
      corpo: 'Você disse que queria: {{porqueTexto}}. Isso ainda vale.',
    });

    const { result } = await renderHook(() => useReturnAfterPause('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscarSystemMessage).toHaveBeenCalledWith('retorno_pausa');
    expect(result.current.porqueTexto).toBe('Terminar meus estudos');
    expect(result.current.corpoComTexto).toBe(
      'Você disse que queria: Terminar meus estudos. Isso ainda vale.',
    );
  });

  it('enviarTarefaInicial grava a tarefa em dailyLogs e depois reverte statusStreak para ativo', async () => {
    buscarUsuario.mockResolvedValue({ porqueTexto: 'Foco' });
    buscarSystemMessage.mockResolvedValue({ titulo: 't', corpo: 'c' });

    const { result } = await renderHook(() => useReturnAfterPause('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await result.current.enviarTarefaInicial('Guardar o celular na gaveta às 20h');

    expect(adicionarTarefaAoDailyLog).toHaveBeenCalledWith(
      'uid-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.objectContaining({
        titulo: 'Guardar o celular na gaveta às 20h',
        essencial: true,
        concluida: false,
      }),
    );
    expect(atualizarStatusStreak).toHaveBeenCalledWith('uid-1', 'ativo');
  });

  it('propaga o erro quando a gravação falha, sem reverter statusStreak', async () => {
    buscarUsuario.mockResolvedValue({ porqueTexto: 'Foco' });
    buscarSystemMessage.mockResolvedValue({ titulo: 't', corpo: 'c' });
    adicionarTarefaAoDailyLog.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useReturnAfterPause('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(
      result.current.enviarTarefaInicial('Tarefa qualquer'),
    ).rejects.toThrow('offline');
    expect(atualizarStatusStreak).not.toHaveBeenCalled();
  });
});
