import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePerfil } from './usePerfil';

jest.mock('../services/firestore');
jest.mock('../services/notifications');
jest.mock('./useToast');

const { buscarUsuario, atualizarPerfilUsuario } = require('../services/firestore');
const {
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
  cancelarLembreteDiario,
} = require('../services/notifications');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const USUARIO_BASE = {
  porqueTexto: 'Terminar meus estudos',
  notificacoesAtivas: false,
  horarioLembreteDiario: null,
};

describe('usePerfil', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    atualizarPerfilUsuario.mockResolvedValue(undefined);
    agendarLembreteDiario.mockResolvedValue(undefined);
    avaliarNecessidadeAlertaRisco.mockResolvedValue(undefined);
    cancelarLembreteDiario.mockResolvedValue(undefined);
    useToast.mockReturnValue({ showToast });
  });

  it('carrega porqueTexto/notificacoesAtivas/horarioLembreteDiario de buscarUsuario', async () => {
    buscarUsuario.mockResolvedValue({
      ...USUARIO_BASE,
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    const { result } = await renderHook(() => usePerfil('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscarUsuario).toHaveBeenCalledWith('uid-1');
    expect(result.current.porqueTexto).toBe('Terminar meus estudos');
    expect(result.current.notificacoesAtivas).toBe(true);
    expect(result.current.horarioLembreteDiario).toBe('08:00');
  });

  it('salvarPorque grava no Firestore, atualiza o estado local e resolve true (sem toast)', async () => {
    buscarUsuario.mockResolvedValue(USUARIO_BASE);

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.salvarPorque('Novo porquê');
    });

    expect(atualizarPerfilUsuario).toHaveBeenCalledWith('uid-1', {
      porqueTexto: 'Novo porquê',
    });
    expect(result.current.porqueTexto).toBe('Novo porquê');
    expect(retorno).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('salvarPorque com falha de rede: resolve false, dispara toast e não muda o estado local', async () => {
    buscarUsuario.mockResolvedValue(USUARIO_BASE);
    atualizarPerfilUsuario.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.salvarPorque('Novo porquê');
    });

    expect(retorno).toBe(false);
    expect(result.current.porqueTexto).toBe('Terminar meus estudos');
    expect(showToast).toHaveBeenCalledWith(
      'Não conseguimos salvar seu porquê agora. Tente de novo.',
    );
  });

  it('alternarNotificacoes com falha de rede: dispara toast e não muda o estado local', async () => {
    buscarUsuario.mockResolvedValue(USUARIO_BASE);
    atualizarPerfilUsuario.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alternarNotificacoes(true);
    });

    expect(result.current.notificacoesAtivas).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      'Não conseguimos atualizar as notificações agora. Tente de novo.',
    );
  });

  it('alterarHorario com falha de rede: dispara toast e não muda o estado local', async () => {
    buscarUsuario.mockResolvedValue(USUARIO_BASE);
    atualizarPerfilUsuario.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alterarHorario('20:00');
    });

    expect(result.current.horarioLembreteDiario).toBeNull();
    expect(showToast).toHaveBeenCalledWith(
      'Não conseguimos salvar o horário agora. Tente de novo.',
    );
  });

  it('alternarNotificacoes(true) com horário já definido: grava e agenda o lembrete', async () => {
    buscarUsuario.mockResolvedValue({
      ...USUARIO_BASE,
      notificacoesAtivas: false,
      horarioLembreteDiario: '08:00',
    });

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alternarNotificacoes(true);
    });

    expect(atualizarPerfilUsuario).toHaveBeenCalledWith('uid-1', {
      notificacoesAtivas: true,
    });
    expect(agendarLembreteDiario).toHaveBeenCalledWith('08:00');
    expect(cancelarLembreteDiario).not.toHaveBeenCalled();
    expect(result.current.notificacoesAtivas).toBe(true);
  });

  it('alternarNotificacoes(false): grava, cancela o lembrete diário e cancela o alerta de risco pendente', async () => {
    buscarUsuario.mockResolvedValue({
      ...USUARIO_BASE,
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alternarNotificacoes(false);
    });

    expect(atualizarPerfilUsuario).toHaveBeenCalledWith('uid-1', {
      notificacoesAtivas: false,
    });
    expect(cancelarLembreteDiario).toHaveBeenCalledTimes(1);
    expect(avaliarNecessidadeAlertaRisco).toHaveBeenCalledWith(true);
    expect(agendarLembreteDiario).not.toHaveBeenCalled();
    expect(result.current.notificacoesAtivas).toBe(false);
  });

  it('alterarHorario com notificações já ativas: grava e reagenda o lembrete diário', async () => {
    buscarUsuario.mockResolvedValue({
      ...USUARIO_BASE,
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alterarHorario('20:00');
    });

    expect(atualizarPerfilUsuario).toHaveBeenCalledWith('uid-1', {
      horarioLembreteDiario: '20:00',
    });
    expect(agendarLembreteDiario).toHaveBeenCalledWith('20:00');
    expect(result.current.horarioLembreteDiario).toBe('20:00');
  });

  it('alterarHorario com notificações desativadas: só grava, não agenda nada', async () => {
    buscarUsuario.mockResolvedValue({
      ...USUARIO_BASE,
      notificacoesAtivas: false,
      horarioLembreteDiario: '08:00',
    });

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alterarHorario('20:00');
    });

    expect(atualizarPerfilUsuario).toHaveBeenCalledWith('uid-1', {
      horarioLembreteDiario: '20:00',
    });
    expect(agendarLembreteDiario).not.toHaveBeenCalled();
    expect(result.current.horarioLembreteDiario).toBe('20:00');
  });

  it('alternarNotificacoes(true) sem horário definido ainda: grava mas não agenda (nada pra agendar)', async () => {
    buscarUsuario.mockResolvedValue({
      ...USUARIO_BASE,
      notificacoesAtivas: false,
      horarioLembreteDiario: null,
    });

    const { result } = await renderHook(() => usePerfil('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.alternarNotificacoes(true);
    });

    expect(agendarLembreteDiario).not.toHaveBeenCalled();
    expect(result.current.notificacoesAtivas).toBe(true);
  });
});
