import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PerfilScreen } from './PerfilScreen';

jest.mock('../../hooks/usePerfil');
jest.mock('../../hooks/useAuth');

const { usePerfil } = require('../../hooks/usePerfil');
const { useAuth } = require('../../hooks/useAuth');

function configurarPerfilPadrao(sobrescritas = {}) {
  usePerfil.mockReturnValue({
    porqueTexto: 'Terminar meus estudos',
    notificacoesAtivas: false,
    horarioLembreteDiario: null,
    carregando: false,
    salvarPorque: jest.fn().mockResolvedValue(undefined),
    alternarNotificacoes: jest.fn().mockResolvedValue(undefined),
    alterarHorario: jest.fn().mockResolvedValue(undefined),
    ...sobrescritas,
  });
}

describe('PerfilScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarPerfilPadrao();
    useAuth.mockReturnValue({
      user: { uid: 'uid-teste' },
      carregando: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
    });
  });

  it('mostra o porquê atual carregado de usePerfil', async () => {
    await render(<PerfilScreen uid="uid-teste" />);

    expect(screen.getByDisplayValue('Terminar meus estudos')).toBeTruthy();
  });

  it('botão Salvar chama salvarPorque só ao tocar, com o texto atual — não a cada tecla', async () => {
    const salvarPorque = jest.fn().mockResolvedValue(undefined);
    configurarPerfilPadrao({ salvarPorque });

    await render(<PerfilScreen uid="uid-teste" />);

    await fireEvent.changeText(
      screen.getByDisplayValue('Terminar meus estudos'),
      'Terminar meus estudos sem culpa',
    );
    expect(salvarPorque).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Salvar'));

    expect(salvarPorque).toHaveBeenCalledTimes(1);
    expect(salvarPorque).toHaveBeenCalledWith('Terminar meus estudos sem culpa');
  });

  it('mostra "Salvo" depois de salvar o porquê', async () => {
    await render(<PerfilScreen uid="uid-teste" />);

    expect(screen.queryByText('Salvo')).toBeNull();

    await fireEvent.press(screen.getByText('Salvar'));

    await waitFor(() => expect(screen.getByText('Salvo')).toBeTruthy());
  });

  it('seletor de horário não aparece com notificações desativadas', async () => {
    await render(<PerfilScreen uid="uid-teste" />);

    expect(screen.queryByText('Alterar horário')).toBeNull();
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();
  });

  it('seletor de horário aparece só depois de ativar as notificações e tocar em Alterar horário', async () => {
    configurarPerfilPadrao({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    await render(<PerfilScreen uid="uid-teste" />);

    expect(screen.getByText('Horário: 08:00')).toBeTruthy();
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();

    await fireEvent.press(screen.getByText('Alterar horário'));

    expect(screen.getByTestId('datetimepicker-mock')).toBeTruthy();
  });

  it('escolher um horário no seletor chama alterarHorario e fecha o seletor', async () => {
    const alterarHorario = jest.fn().mockResolvedValue(undefined);
    configurarPerfilPadrao({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
      alterarHorario,
    });

    await render(<PerfilScreen uid="uid-teste" />);
    await fireEvent.press(screen.getByText('Alterar horário'));
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    expect(alterarHorario).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();
  });

  it('toggle de notificações chama alternarNotificacoes com o novo valor', async () => {
    const alternarNotificacoes = jest.fn().mockResolvedValue(undefined);
    configurarPerfilPadrao({ alternarNotificacoes });

    await render(<PerfilScreen uid="uid-teste" />);
    await fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(alternarNotificacoes).toHaveBeenCalledWith(true);
  });

  it('botão Sair chama signOut', async () => {
    const signOut = jest.fn();
    useAuth.mockReturnValue({
      user: { uid: 'uid-teste' },
      carregando: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut,
      resetPassword: jest.fn(),
    });

    await render(<PerfilScreen uid="uid-teste" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('mostra o LoadingIndicator enquanto usePerfil carrega e o formulário só depois', async () => {
    configurarPerfilPadrao({ carregando: true });

    const { rerender } = await render(<PerfilScreen uid="uid-teste" />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Seu porquê')).toBeNull();
    expect(screen.queryByDisplayValue('Terminar meus estudos')).toBeNull();

    configurarPerfilPadrao({ carregando: false });
    rerender(<PerfilScreen uid="uid-teste" />);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Terminar meus estudos')).toBeTruthy(),
    );
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
  });
});
