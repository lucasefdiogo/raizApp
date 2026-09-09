import { renderHook, waitFor } from '@testing-library/react-native';
import { useLocalNotifications } from './useLocalNotifications';

jest.mock('../services/firestore');
jest.mock('../services/notifications');

const { buscarUsuario } = require('../services/firestore');
const {
  solicitarPermissao,
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
} = require('../services/notifications');

describe('useLocalNotifications', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('não configura nada enquanto pronto é false', async () => {
    const { rerender } = await renderHook(
      ({ pronto }: { pronto: boolean }) => useLocalNotifications('uid-1', pronto),
      { initialProps: { pronto: false } },
    );

    expect(buscarUsuario).not.toHaveBeenCalled();

    await rerender({ pronto: false });
    expect(buscarUsuario).not.toHaveBeenCalled();
  });

  it('solicita permissão e agenda o lembrete diário uma única vez quando pronto vira true', async () => {
    buscarUsuario.mockResolvedValue({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    const { rerender } = await renderHook(
      ({ pronto }: { pronto: boolean }) => useLocalNotifications('uid-1', pronto),
      { initialProps: { pronto: true } },
    );

    await waitFor(() => expect(agendarLembreteDiario).toHaveBeenCalledTimes(1));
    expect(solicitarPermissao).toHaveBeenCalledTimes(1);
    expect(agendarLembreteDiario).toHaveBeenCalledWith('08:00');

    // re-renderiza várias vezes com pronto ainda true — não deve rodar de novo
    await rerender({ pronto: true });
    await rerender({ pronto: true });

    expect(buscarUsuario).toHaveBeenCalledTimes(1);
    expect(solicitarPermissao).toHaveBeenCalledTimes(1);
    expect(agendarLembreteDiario).toHaveBeenCalledTimes(1);
  });

  it('não agenda o lembrete quando notificacoesAtivas é false', async () => {
    buscarUsuario.mockResolvedValue({
      notificacoesAtivas: false,
      horarioLembreteDiario: '08:00',
    });

    await renderHook(() => useLocalNotifications('uid-1', true));

    await waitFor(() => expect(buscarUsuario).toHaveBeenCalledTimes(1));
    expect(solicitarPermissao).not.toHaveBeenCalled();
    expect(agendarLembreteDiario).not.toHaveBeenCalled();
  });

  it('avaliarAlertaRisco é chamável repetidamente, sempre encaminhando pro service (que evita duplicata)', async () => {
    buscarUsuario.mockResolvedValue({
      notificacoesAtivas: false,
      horarioLembreteDiario: null,
    });

    const { result } = await renderHook(() =>
      useLocalNotifications('uid-1', true),
    );

    result.current.avaliarAlertaRisco(false);
    result.current.avaliarAlertaRisco(true);
    result.current.avaliarAlertaRisco(false);

    expect(avaliarNecessidadeAlertaRisco).toHaveBeenCalledTimes(3);
    expect(avaliarNecessidadeAlertaRisco).toHaveBeenNthCalledWith(1, false);
    expect(avaliarNecessidadeAlertaRisco).toHaveBeenNthCalledWith(2, true);
    expect(avaliarNecessidadeAlertaRisco).toHaveBeenNthCalledWith(3, false);
  });
});
