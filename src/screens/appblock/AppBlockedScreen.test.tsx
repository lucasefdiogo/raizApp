import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppBlockedScreen } from './AppBlockedScreen';

jest.mock('../../hooks/useDailyTasks');
const { useDailyTasks } = require('../../hooks/useDailyTasks');

/**
 * A contagem usa setTimeout recursivo (cada próximo só é agendado depois
 * que o efeito da renderização anterior roda) — um único
 * advanceTimersByTime(60000) processa só o primeiro tick porque o segundo
 * ainda não foi agendado no fake timer queue nesse ponto. Avança 1s por vez,
 * cada um no seu próprio act(), pra dar tempo do efeito reagendar o
 * próximo antes do avanço seguinte.
 */
async function avancarSegundos(segundos: number) {
  for (let i = 0; i < segundos; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

const APP_BLOQUEADO = {
  packageName: 'com.instagram.android',
  nome: 'Instagram',
  icone: null,
};

function configurarTarefas(sobrescritas = {}) {
  useDailyTasks.mockReturnValue({
    tarefas: [],
    alternarTarefa: jest.fn(),
    adicionarTarefa: jest.fn(),
    editarTarefa: jest.fn(),
    removerTarefa: jest.fn(),
    statusDia: 'pendente',
    carregando: false,
    limiteEssenciaisAtingido: false,
    recarregar: jest.fn(),
    ...sobrescritas,
  });
}

describe('AppBlockedScreen', () => {
  let onDesbloquear: jest.Mock;
  let onFechar: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    onDesbloquear = jest.fn();
    onFechar = jest.fn();
    configurarTarefas();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('mostra o nome do app bloqueado e as duas opções de desbloqueio', async () => {
    await render(
      <AppBlockedScreen
        uid="uid-teste"
        appBloqueado={APP_BLOQUEADO}
        onDesbloquear={onDesbloquear}
        onFechar={onFechar}
      />,
    );

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('Cumprir minhas tarefas essenciais')).toBeTruthy();
    expect(screen.getByText('Pausa de respiração (60s)')).toBeTruthy();
  });

  it('enquanto as tarefas carregam: opção de tarefas mostra o estado de verificação', async () => {
    configurarTarefas({ carregando: true });
    await render(
      <AppBlockedScreen
        uid="uid-teste"
        appBloqueado={APP_BLOQUEADO}
        onDesbloquear={onDesbloquear}
        onFechar={onFechar}
      />,
    );

    expect(screen.getByText('Verificando suas tarefas de hoje…')).toBeTruthy();
    expect(
      screen.queryByText('Se já cumpriu hoje, libera na hora.'),
    ).toBeNull();
  });

  it('"Agora não" fecha sem desbloquear', async () => {
    await render(
      <AppBlockedScreen
        uid="uid-teste"
        appBloqueado={APP_BLOQUEADO}
        onDesbloquear={onDesbloquear}
        onFechar={onFechar}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Agora não'));
    });

    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(onDesbloquear).not.toHaveBeenCalled();
  });

  describe('fluxo: tarefas essenciais', () => {
    it('tarefas essenciais já concluídas hoje: desbloqueia na hora', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: true }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });

      expect(onDesbloquear).toHaveBeenCalledWith(15);
      expect(screen.getByText('Liberado por 15 minutos')).toBeTruthy();
    });

    it('tarefas essenciais pendentes: mostra o aviso e NÃO desbloqueia', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: false }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(
        screen.getByText('Ainda faltam suas tarefas essenciais de hoje.'),
      ).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByText('Ir para o Rootora'));
      });

      expect(onFechar).toHaveBeenCalledTimes(1);
      expect(onDesbloquear).not.toHaveBeenCalled();
    });

    it('sem nenhuma tarefa essencial no dia: também conta como pendente', async () => {
      configurarTarefas({ tarefas: [] });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(
        screen.getByText('Ainda faltam suas tarefas essenciais de hoje.'),
      ).toBeTruthy();
    });
  });

  describe('fluxo: pausa de respiração', () => {
    it('não desbloqueia antes dos 60s completarem', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Pausa de respiração (60s)'));
      });

      expect(screen.getByTestId('pausa-respiracao')).toBeTruthy();

      await avancarSegundos(59);

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(screen.queryByText('Liberado por 15 minutos')).toBeNull();
    });

    it('desbloqueia automaticamente ao completar os 60s', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Pausa de respiração (60s)'));
      });

      await avancarSegundos(60);

      expect(onDesbloquear).toHaveBeenCalledWith(15);
      expect(screen.getByText('Liberado por 15 minutos')).toBeTruthy();
    });

    it('não deixa pular — não existe nenhum botão de pular/acelerar durante a contagem', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Pausa de respiração (60s)'));
      });

      expect(screen.queryByText('Pular')).toBeNull();
      expect(screen.queryByRole('button', { name: /pular|avançar/i })).toBeNull();
    });
  });
});
