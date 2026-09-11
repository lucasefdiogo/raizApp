import { renderHook, waitFor } from '@testing-library/react-native';
import { useNomeUsuario } from './useNomeUsuario';

jest.mock('../services/firestore');

const { buscarUsuario } = require('../services/firestore');

describe('useNomeUsuario', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('resolve pro nome vindo de buscarUsuario', async () => {
    buscarUsuario.mockResolvedValue({ nome: 'Ana' });

    const { result } = await renderHook(() => useNomeUsuario('uid-1'));

    await waitFor(() => expect(result.current).toBe('Ana'));
    expect(buscarUsuario).toHaveBeenCalledWith('uid-1');
  });

  it('nome vazio (default do documento): fica vazio, sem erro', async () => {
    buscarUsuario.mockResolvedValue({ nome: '' });

    const { result } = await renderHook(() => useNomeUsuario('uid-1'));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(result.current).toBe('');
  });

  it('usuário inexistente (buscarUsuario resolve null): fica vazio, sem quebrar', async () => {
    buscarUsuario.mockResolvedValue(null);

    const { result } = await renderHook(() => useNomeUsuario('uid-1'));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(result.current).toBe('');
  });

  it('não vaza o nome de um uid anterior ao trocar de usuário', async () => {
    buscarUsuario.mockResolvedValue({ nome: 'Ana' });
    const { result, rerender } = await renderHook(
      ({ uid }: { uid: string }) => useNomeUsuario(uid),
      { initialProps: { uid: 'uid-1' } },
    );
    await waitFor(() => expect(result.current).toBe('Ana'));

    buscarUsuario.mockResolvedValue({ nome: 'Beto' });
    await rerender({ uid: 'uid-2' });

    await waitFor(() => expect(result.current).toBe('Beto'));
    expect(buscarUsuario).toHaveBeenLastCalledWith('uid-2');
  });
});
