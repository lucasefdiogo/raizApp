import { renderHook, waitFor } from '@testing-library/react-native';
import { useAlternativaNoturna } from './useAlternativaNoturna';

jest.mock('../services/firestore');

const { buscarUsuario } = require('../services/firestore');

describe('HU-07 · useAlternativaNoturna', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('resolve pra rotina.alternativaNoturna vinda de buscarUsuario', async () => {
    buscarUsuario.mockResolvedValue({ rotina: { alternativaNoturna: 'Ler antes de dormir' } });

    const { result } = await renderHook(() => useAlternativaNoturna('uid-1'));

    await waitFor(() => expect(result.current).toBe('Ler antes de dormir'));
    expect(buscarUsuario).toHaveBeenCalledWith('uid-1');
  });

  it('sem rotina: fica null, sem erro', async () => {
    buscarUsuario.mockResolvedValue({});

    const { result } = await renderHook(() => useAlternativaNoturna('uid-1'));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('usuário inexistente (buscarUsuario resolve null): fica null, sem quebrar', async () => {
    buscarUsuario.mockResolvedValue(null);

    const { result } = await renderHook(() => useAlternativaNoturna('uid-1'));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
