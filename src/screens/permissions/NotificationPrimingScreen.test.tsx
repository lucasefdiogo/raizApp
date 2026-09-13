import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPrimingScreen } from './NotificationPrimingScreen';
import { useLocalNotifications } from '../../hooks/useLocalNotifications';

jest.mock('../../services/firestore');
jest.mock('../../services/notifications');

const { buscarUsuario } = require('../../services/firestore');
const { solicitarPermissao } = require('../../services/notifications');

describe('NotificationPrimingScreen', () => {
  it('mostra o título, a introdução e os 3 itens da lista', async () => {
    await render(
      <NotificationPrimingScreen onPermitir={jest.fn()} onRecusar={jest.fn()} />,
    );

    expect(
      screen.getByText('Só 2 tipos de aviso, nada além disso'),
    ).toBeTruthy();
    expect(
      screen.getByText('Se você permitir, o Rootora manda no máximo:'),
    ).toBeTruthy();
    expect(
      screen.getByText('Um lembrete, 1x ao dia, no horário que você escolher'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Um aviso perto do fim do dia, só se sua tarefa essencial ainda não foi feita',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Sem notificação de marketing ou novidade'),
    ).toBeTruthy();
  });

  it('"Permitir notificações" chama onPermitir, nunca onRecusar', async () => {
    const onPermitir = jest.fn();
    const onRecusar = jest.fn();
    await render(
      <NotificationPrimingScreen onPermitir={onPermitir} onRecusar={onRecusar} />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Permitir notificações' }),
    );

    expect(onPermitir).toHaveBeenCalledTimes(1);
    expect(onRecusar).not.toHaveBeenCalled();
  });

  it('"Agora não" chama onRecusar, nunca onPermitir', async () => {
    const onPermitir = jest.fn();
    const onRecusar = jest.fn();
    await render(
      <NotificationPrimingScreen onPermitir={onPermitir} onRecusar={onRecusar} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));

    expect(onRecusar).toHaveBeenCalledTimes(1);
    expect(onPermitir).not.toHaveBeenCalled();
  });
});

// Integração com o hook real (mesma ligação que RootNavigator faz) — cobre
// a garantia fim a fim: "Permitir notificações" precisa chegar até
// solicitarPermissao(), e "Agora não" nunca pode chamá-lo.
describe('NotificationPrimingScreen + useLocalNotifications (integração)', () => {
  function TelaConectada() {
    const notificacoes = useLocalNotifications('uid-1', true);
    if (!notificacoes.deveExibirPriming) {
      return null;
    }
    return (
      <NotificationPrimingScreen
        onPermitir={() => notificacoes.concluirPriming(true)}
        onRecusar={() => notificacoes.concluirPriming(false)}
      />
    );
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    buscarUsuario.mockResolvedValue({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });
  });

  it('"Permitir notificações" chama solicitarPermissao()', async () => {
    await render(<TelaConectada />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Permitir notificações' }),
      ).toBeTruthy(),
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Permitir notificações' }),
    );

    await waitFor(() => expect(solicitarPermissao).toHaveBeenCalledTimes(1));
  });

  it('"Agora não" nunca chama solicitarPermissao()', async () => {
    await render(<TelaConectada />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Agora não' })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));

    expect(solicitarPermissao).not.toHaveBeenCalled();
  });
});
