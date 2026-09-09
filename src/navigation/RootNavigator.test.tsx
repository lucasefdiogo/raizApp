import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RootNavigator } from './RootNavigator';

jest.mock('../hooks/useTutorialStatus');
jest.mock('../hooks/useAuth');
jest.mock('../hooks/useOnboardingStatus');
jest.mock('../hooks/useStreak');
jest.mock('../hooks/useRecoveryState');

const { useTutorialStatus } = require('../hooks/useTutorialStatus');
const { useAuth } = require('../hooks/useAuth');
const { useOnboardingStatus } = require('../hooks/useOnboardingStatus');
const { useStreak } = require('../hooks/useStreak');
const { useRecoveryState } = require('../hooks/useRecoveryState');

const ESTADO_BASE_STREAK = {
  streakAtual: 5,
  diasTotaisAtivos: 10,
  escudosDisponiveis: 1,
  statusDiaAnterior: null,
  marcoAtingido: null,
  carregando: false,
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
