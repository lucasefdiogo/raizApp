import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useStreakMilestone } from './useStreakMilestone';

jest.mock('../services/firestore');
const { buscarSystemMessage } = require('../services/firestore');

describe('useStreakMilestone', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('marcoAtingido nulo: não busca nada e não exibe nenhum marco', async () => {
    const { result } = await renderHook(() => useStreakMilestone(null));

    expect(buscarSystemMessage).not.toHaveBeenCalled();
    expect(result.current.marcoParaExibir).toBeNull();
  });

  it('busca systemMessages/marco_{N} e expõe o corpo quando marcoAtingido muda', async () => {
    buscarSystemMessage.mockResolvedValue({
      titulo: 'Sete dias seguidos',
      corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
    });

    const { result } = await renderHook(() => useStreakMilestone(7));

    await waitFor(() => expect(result.current.marcoParaExibir).toBe(7));
    expect(buscarSystemMessage).toHaveBeenCalledWith('marco_7');
    expect(result.current.corpoParaExibir).toBe(
      'Uma semana inteira sustentando o combinado com você mesmo.',
    );
  });

  it('expõe corpo vazio quando a mensagem não está seedada no Firestore', async () => {
    buscarSystemMessage.mockResolvedValue(null);

    const { result } = await renderHook(() => useStreakMilestone(3));

    await waitFor(() => expect(result.current.marcoParaExibir).toBe(3));
    expect(result.current.corpoParaExibir).toBe('');
  });

  it('limparMarcoExibido reseta marcoParaExibir para null', async () => {
    buscarSystemMessage.mockResolvedValue({ titulo: 't', corpo: 'c' });

    const { result } = await renderHook(() => useStreakMilestone(3));
    await waitFor(() => expect(result.current.marcoParaExibir).toBe(3));

    await act(async () => {
      result.current.limparMarcoExibido();
    });

    expect(result.current.marcoParaExibir).toBeNull();
  });
});
