import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { RootNavigator } from './RootNavigator';

jest.mock('../hooks/useTutorialStatus');
jest.mock('../hooks/useAuth');
jest.mock('../hooks/useOnboardingStatus');
jest.mock('../hooks/useStreak');
jest.mock('../hooks/useRecoveryState');
jest.mock('../hooks/useReturnAfterPause');
jest.mock('../hooks/useProgressoSemanal');
jest.mock('../hooks/useLocalNotifications');
jest.mock('../hooks/useDailyTasks');

const { useTutorialStatus } = require('../hooks/useTutorialStatus');
const { useAuth } = require('../hooks/useAuth');
const { useOnboardingStatus } = require('../hooks/useOnboardingStatus');
const { useStreak } = require('../hooks/useStreak');
const { useRecoveryState } = require('../hooks/useRecoveryState');
const { useReturnAfterPause } = require('../hooks/useReturnAfterPause');
const { useProgressoSemanal } = require('../hooks/useProgressoSemanal');
const { useLocalNotifications } = require('../hooks/useLocalNotifications');
const { useDailyTasks } = require('../hooks/useDailyTasks');

const ESTADO_BASE_STREAK = {
  streakAtual: 5,
  diasTotaisAtivos: 10,
  escudosDisponiveis: 1,
  statusDiaAnterior: null,
  statusStreak: 'ativo',
  marcoAtingido: null,
  carregando: false,
  marcarRetornoConcluido: jest.fn(),
};

function configurarHooksPadrao() {
  useTutorialStatus.mockReturnValue({
    carregando: false,
    tutorialVisto: true,
    marcarTutorialVisto: jest.fn(),
  });
  useAuth.mockReturnValue({
    carregando: false,
    user: { uid: 'uid-teste' },
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signUp: jest.fn(),
    resetPassword: jest.fn(),
  });
  useOnboardingStatus.mockReturnValue({
    carregando: false,
    completo: true,
    marcarComoCompleto: jest.fn(),
  });
  useStreak.mockReturnValue(ESTADO_BASE_STREAK);
  useReturnAfterPause.mockReturnValue({
    porqueTexto: 'Terminar meus estudos',
    corpoComTexto: 'Alguns dias passaram, e tudo bem.',
    carregando: false,
    enviarTarefaInicial: jest.fn().mockResolvedValue(undefined),
  });
  useProgressoSemanal.mockReturnValue({
    historico: [],
    streakAtual: 5,
    diasTotaisAtivos: 10,
    carregando: false,
  });
  useLocalNotifications.mockReturnValue({
    avaliarAlertaRisco: jest.fn(),
  });
  useDailyTasks.mockReturnValue({
    tarefas: [],
    alternarTarefa: jest.fn(),
    statusDia: 'pendente',
    carregando: false,
  });
}

describe('RootNavigator — tela de recaída', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHooksPadrao();
  });

  it('não mostra RecoveryStateScreen quando deveExibir é false — vai direto pra Home', async () => {
    useRecoveryState.mockReturnValue({
      deveExibir: false,
      tipo: null,
      corpo: null,
      marcarComoExibido: jest.fn(),
    });

    await render(<RootNavigator />);

    expect(screen.queryByText('Ver tarefas de hoje')).toBeNull();
    expect(screen.getByText('Tarefas de hoje')).toBeTruthy();
  });

  it('mostra RecoveryStateScreen quando deveExibir é true, e marcarComoExibido navega pra Home', async () => {
    const marcarComoExibido = jest.fn();
    useRecoveryState.mockReturnValue({
      deveExibir: true,
      tipo: 'escudo',
      corpo: 'O escudo cobriu o dia de ontem por você.',
      marcarComoExibido,
    });

    await render(<RootNavigator />);

    expect(screen.getByText('Ver tarefas de hoje')).toBeTruthy();
    expect(screen.queryByText('Tarefas de hoje')).toBeNull();

    await fireEvent.press(screen.getByText('Ver tarefas de hoje'));
    expect(marcarComoExibido).toHaveBeenCalledTimes(1);
  });
});

describe('RootNavigator — retorno após pausa', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHooksPadrao();
    useRecoveryState.mockReturnValue({
      deveExibir: false,
      tipo: null,
      corpo: null,
      marcarComoExibido: jest.fn(),
    });
  });

  it('statusStreak ativo: não mostra ReturnAfterPauseScreen', async () => {
    await render(<RootNavigator />);

    expect(screen.queryByText('Voltar a começar')).toBeNull();
  });

  it('statusStreak pausado: mostra ReturnAfterPauseScreen com prioridade sobre a recaída de 1 dia', async () => {
    useStreak.mockReturnValue({ ...ESTADO_BASE_STREAK, statusStreak: 'pausado' });
    useRecoveryState.mockReturnValue({
      deveExibir: true,
      tipo: 'reduzido',
      corpo: 'texto de recaída',
      marcarComoExibido: jest.fn(),
    });

    await render(<RootNavigator />);

    expect(screen.getByText('Voltar a começar')).toBeTruthy();
    expect(screen.queryByText('Ver tarefas de hoje')).toBeNull();
    expect(screen.queryByText('Tarefas de hoje')).toBeNull();
  });

  it('navega pra Home só depois que enviarTarefaInicial resolve com sucesso', async () => {
    let resolverEnvio: () => void = () => {};
    const enviarTarefaInicial = jest.fn(
      () => new Promise<void>(resolve => { resolverEnvio = resolve; }),
    );
    const marcarRetornoConcluido = jest.fn();

    useStreak.mockReturnValue({
      ...ESTADO_BASE_STREAK,
      statusStreak: 'pausado',
      marcarRetornoConcluido,
    });
    useReturnAfterPause.mockReturnValue({
      porqueTexto: 'Terminar meus estudos',
      corpoComTexto: 'Alguns dias passaram, e tudo bem.',
      carregando: false,
      enviarTarefaInicial,
    });

    await render(<RootNavigator />);

    await fireEvent.changeText(
      screen.getByPlaceholderText('ex: guardar o celular na gaveta às 20h'),
      'Guardar o celular na gaveta às 20h',
    );
    await fireEvent.press(screen.getByText('Voltar a começar'));

    expect(marcarRetornoConcluido).not.toHaveBeenCalled();

    await act(async () => {
      resolverEnvio();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(marcarRetornoConcluido).toHaveBeenCalledTimes(1);
  });

  it('não chama marcarRetornoConcluido quando a gravação falha', async () => {
    const marcarRetornoConcluido = jest.fn();
    const enviarTarefaInicial = jest.fn().mockRejectedValue(new Error('offline'));

    useStreak.mockReturnValue({
      ...ESTADO_BASE_STREAK,
      statusStreak: 'pausado',
      marcarRetornoConcluido,
    });
    useReturnAfterPause.mockReturnValue({
      porqueTexto: 'Terminar meus estudos',
      corpoComTexto: 'Alguns dias passaram, e tudo bem.',
      carregando: false,
      enviarTarefaInicial,
    });

    await render(<RootNavigator />);

    await fireEvent.changeText(
      screen.getByPlaceholderText('ex: guardar o celular na gaveta às 20h'),
      'Guardar o celular na gaveta às 20h',
    );
    await fireEvent.press(screen.getByText('Voltar a começar'));
    await waitFor(() =>
      expect(
        screen.getByText('Não deu pra salvar agora. Tenta de novo em instantes.'),
      ).toBeTruthy(),
    );

    expect(marcarRetornoConcluido).not.toHaveBeenCalled();
    expect(screen.getByText('Voltar a começar')).toBeTruthy();
  });
});

describe('RootNavigator — navegação pra tela de progresso', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHooksPadrao();
    useRecoveryState.mockReturnValue({
      deveExibir: false,
      tipo: null,
      corpo: null,
      marcarComoExibido: jest.fn(),
    });
  });

  it('toca em Ver progresso na Home e navega pra ProgressoScreen', async () => {
    await render(<RootNavigator />);

    expect(screen.getByText('Tarefas de hoje')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ver progresso'));

    await waitFor(() => expect(screen.getByText('Seu progresso')).toBeTruthy());
  });
});
