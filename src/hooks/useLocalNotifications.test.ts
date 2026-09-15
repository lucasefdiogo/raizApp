import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalNotifications } from './useLocalNotifications';
import { STORAGE_KEYS } from '../utils/storage';

jest.mock('../services/firestore');
jest.mock('../services/notifications');
jest.mock('../services/analytics');

const { buscarUsuario } = require('../services/firestore');
const {
  solicitarPermissao,
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
} = require('../services/notifications');
const { logPermissaoNotificacao } = require('../services/analytics');

describe('useLocalNotifications', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
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

  it('priming já mostrado antes: solicita permissão e agenda o lembrete diário direto, sem expor deveExibirPriming', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.notificationPrimingShown,
      JSON.stringify(true),
    );
    buscarUsuario.mockResolvedValue({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    const { result, rerender } = await renderHook(
      ({ pronto }: { pronto: boolean }) => useLocalNotifications('uid-1', pronto),
      { initialProps: { pronto: true } },
    );

    await waitFor(() => expect(agendarLembreteDiario).toHaveBeenCalledTimes(1));
    expect(solicitarPermissao).toHaveBeenCalledTimes(1);
    expect(agendarLembreteDiario).toHaveBeenCalledWith('08:00');
    expect(result.current.deveExibirPriming).toBe(false);

    // re-renderiza várias vezes com pronto ainda true — não deve rodar de novo
    await rerender({ pronto: true });
    await rerender({ pronto: true });

    expect(buscarUsuario).toHaveBeenCalledTimes(1);
    expect(solicitarPermissao).toHaveBeenCalledTimes(1);
    expect(agendarLembreteDiario).toHaveBeenCalledTimes(1);
  });

  it('não agenda o lembrete quando notificacoesAtivas é false', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.notificationPrimingShown,
      JSON.stringify(true),
    );
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

  describe('priming de notificação (primeira vez, sem notification_priming_shown gravado)', () => {
    it('deveExibirPriming vira true e NÃO chama solicitarPermissao/agendarLembreteDiario direto', async () => {
      buscarUsuario.mockResolvedValue({
        notificacoesAtivas: true,
        horarioLembreteDiario: '08:00',
      });

      const { result } = await renderHook(() =>
        useLocalNotifications('uid-1', true),
      );

      await waitFor(() => expect(result.current.deveExibirPriming).toBe(true));
      expect(solicitarPermissao).not.toHaveBeenCalled();
      expect(agendarLembreteDiario).not.toHaveBeenCalled();
    });

    it('concluirPriming(true): grava a flag, chama solicitarPermissao e agenda o lembrete', async () => {
      buscarUsuario.mockResolvedValue({
        notificacoesAtivas: true,
        horarioLembreteDiario: '08:00',
      });

      const { result } = await renderHook(() =>
        useLocalNotifications('uid-1', true),
      );
      await waitFor(() => expect(result.current.deveExibirPriming).toBe(true));

      await act(async () => {
        await result.current.concluirPriming(true);
      });

      expect(
        await AsyncStorage.getItem(STORAGE_KEYS.notificationPrimingShown),
      ).toBe(JSON.stringify(true));
      expect(solicitarPermissao).toHaveBeenCalledTimes(1);
      expect(agendarLembreteDiario).toHaveBeenCalledWith('08:00');
      expect(result.current.deveExibirPriming).toBe(false);
      expect(logPermissaoNotificacao).toHaveBeenCalledWith(true);
    });

    it('concluirPriming(false): grava a flag e agenda o lembrete, mas nunca chama solicitarPermissao', async () => {
      buscarUsuario.mockResolvedValue({
        notificacoesAtivas: true,
        horarioLembreteDiario: '08:00',
      });

      const { result } = await renderHook(() =>
        useLocalNotifications('uid-1', true),
      );
      await waitFor(() => expect(result.current.deveExibirPriming).toBe(true));

      await act(async () => {
        await result.current.concluirPriming(false);
      });

      expect(
        await AsyncStorage.getItem(STORAGE_KEYS.notificationPrimingShown),
      ).toBe(JSON.stringify(true));
      expect(solicitarPermissao).not.toHaveBeenCalled();
      expect(agendarLembreteDiario).toHaveBeenCalledWith('08:00');
      expect(result.current.deveExibirPriming).toBe(false);
      expect(logPermissaoNotificacao).toHaveBeenCalledWith(false);
    });
  });
});
