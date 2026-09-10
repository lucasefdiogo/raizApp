import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HojeStack } from './HojeStack';

// HojeStack normalmente vive dentro do Tab.Navigator do MainTabNavigator,
// que por sua vez vive dentro do NavigationContainer do RootNavigator —
// aqui, isolado, precisa do próprio NavigationContainer pra registrar.
function renderHojeStack(uid = 'uid-teste') {
  return render(
    <NavigationContainer>
      <HojeStack uid={uid} />
    </NavigationContainer>,
  );
}

jest.mock('../hooks/useStreak');
jest.mock('../hooks/useRecoveryState');
jest.mock('../hooks/useReturnAfterPause');
jest.mock('../hooks/useLocalNotifications');
jest.mock('../hooks/useDailyTasks');
jest.mock('../services/firestore');
jest.mock('../utils/taskFeedbackMessages');

const { useStreak } = require('../hooks/useStreak');
const { useRecoveryState } = require('../hooks/useRecoveryState');
const { useReturnAfterPause } = require('../hooks/useReturnAfterPause');
const { useLocalNotifications } = require('../hooks/useLocalNotifications');
const { useDailyTasks } = require('../hooks/useDailyTasks');
const { buscarSystemMessage } = require('../services/firestore');
const {
  obterMensagemTarefaConcluida,
} = require('../utils/taskFeedbackMessages');

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
  useStreak.mockReturnValue(ESTADO_BASE_STREAK);
  useRecoveryState.mockReturnValue({
    deveExibir: false,
    tipo: null,
    corpo: null,
    marcarComoExibido: jest.fn(),
  });
  useReturnAfterPause.mockReturnValue({
    porqueTexto: 'Terminar meus estudos',
    corpoComTexto: 'Alguns dias passaram, e tudo bem.',
    carregando: false,
    enviarTarefaInicial: jest.fn().mockResolvedValue(undefined),
  });
  useLocalNotifications.mockReturnValue({
    avaliarAlertaRisco: jest.fn(),
  });
  useDailyTasks.mockReturnValue({
    tarefas: [],
    alternarTarefa: jest.fn(),
    adicionarTarefa: jest.fn(),
    editarTarefa: jest.fn(),
    removerTarefa: jest.fn(),
    statusDia: 'pendente',
    carregando: false,
    erro: null,
    limiteEssenciaisAtingido: false,
  });
  buscarSystemMessage.mockResolvedValue({
    titulo: 'Sete dias seguidos',
    corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
  });
  obterMensagemTarefaConcluida.mockReturnValue('Feito. Isso conta.');
}

describe('HojeStack', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHooksPadrao();
  });

  it('mostra o LoadingIndicator fullscreen enquanto useStreak ainda está carregando', async () => {
    useStreak.mockReturnValue({ ...ESTADO_BASE_STREAK, carregando: true });

    await renderHojeStack();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Tarefas de hoje')).toBeNull();
    expect(screen.queryByText('Voltar a começar')).toBeNull();
  });

  it('statusStreak ativo e deveExibir false: mostra a Home', async () => {
    await renderHojeStack();

    expect(screen.getByText('Tarefas de hoje')).toBeTruthy();
  });

  it('deveExibir true: mostra RecoveryStateScreen, e marcarComoExibido navega pra Home', async () => {
    const marcarComoExibido = jest.fn();
    useRecoveryState.mockReturnValue({
      deveExibir: true,
      tipo: 'escudo',
      corpo: 'A proteção cobriu o dia de ontem por você.',
      marcarComoExibido,
    });

    await renderHojeStack();

    expect(screen.getByText('Ver tarefas de hoje')).toBeTruthy();
    expect(screen.queryByText('Tarefas de hoje')).toBeNull();

    await fireEvent.press(screen.getByText('Ver tarefas de hoje'));
    expect(marcarComoExibido).toHaveBeenCalledTimes(1);
  });

  it('statusStreak pausado: mostra ReturnAfterPauseScreen com prioridade sobre a recaída de 1 dia', async () => {
    useStreak.mockReturnValue({ ...ESTADO_BASE_STREAK, statusStreak: 'pausado' });
    useRecoveryState.mockReturnValue({
      deveExibir: true,
      tipo: 'reduzido',
      corpo: 'texto de recaída',
      marcarComoExibido: jest.fn(),
    });

    await renderHojeStack();

    expect(screen.getByText('Voltar a começar')).toBeTruthy();
    expect(screen.queryByText('Ver tarefas de hoje')).toBeNull();
    expect(screen.queryByText('Tarefas de hoje')).toBeNull();
  });

  it('retorno após pausa: navega pra Home só depois que enviarTarefaInicial resolve com sucesso', async () => {
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

    await renderHojeStack();

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

  it('retorno após pausa: não chama marcarRetornoConcluido quando a gravação falha', async () => {
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

    await renderHojeStack();

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

  it('regressão: TaskCompletedOverlay continua aparecendo ao concluir uma tarefa com a Home dentro do HojeStack', async () => {
    useDailyTasks.mockReturnValue({
      tarefas: [
        { id: '1', titulo: 'Abrir o material de estudo por 5 minutos', essencial: true, concluida: false },
      ],
      alternarTarefa: jest.fn(),
      adicionarTarefa: jest.fn(),
      editarTarefa: jest.fn(),
      removerTarefa: jest.fn(),
      statusDia: 'pendente',
      carregando: false,
      erro: null,
      limiteEssenciaisAtingido: false,
    });

    await renderHojeStack();

    await fireEvent.press(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    );

    expect(screen.getByText('Feito. Isso conta.')).toBeTruthy();
  });

  it('regressão: StreakMilestoneModal continua aparecendo com a Home dentro do HojeStack', async () => {
    useStreak.mockReturnValue({ ...ESTADO_BASE_STREAK, marcoAtingido: 7 });

    await renderHojeStack();

    await waitFor(() => expect(screen.getByText('Marco atingido')).toBeTruthy());
    expect(
      screen.getByText(
        'Uma semana inteira sustentando o combinado com você mesmo.',
      ),
    ).toBeTruthy();
  });
});
