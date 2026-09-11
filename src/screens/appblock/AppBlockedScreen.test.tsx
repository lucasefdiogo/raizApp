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
        duracaoRespiracaoSegundos={60}
        precisaReflexao={false}
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
        duracaoRespiracaoSegundos={60}
        precisaReflexao={false}
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
        duracaoRespiracaoSegundos={60}
        precisaReflexao={false}
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

  describe('nível 1 (1º desbloqueio do dia — sem reflexão, comportamento atual)', () => {
    it('tarefas essenciais já concluídas hoje: desbloqueia na hora', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: true }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={60}
          precisaReflexao={false}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });

      expect(onDesbloquear).toHaveBeenCalledWith(15);
      expect(screen.getByText('Liberado por 15 minutos')).toBeTruthy();
      expect(screen.queryByTestId('reflexao-input')).toBeNull();
    });

    it('tarefas essenciais pendentes: mostra o aviso e NÃO desbloqueia', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: false }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={60}
          precisaReflexao={false}
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
          duracaoRespiracaoSegundos={60}
          precisaReflexao={false}
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

    it('não desbloqueia antes dos 60s completarem', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={60}
          precisaReflexao={false}
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

    it('desbloqueia automaticamente ao completar os 60s, sem reflexão', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={60}
          precisaReflexao={false}
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
      expect(screen.queryByTestId('reflexao-input')).toBeNull();
    });

    it('não deixa pular — não existe nenhum botão de pular/acelerar durante a contagem', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={60}
          precisaReflexao={false}
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

  describe('nível 2 (2º desbloqueio do dia — 90s + reflexão obrigatória)', () => {
    it('mostra a duração de 90s na opção de respiração', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={90}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      expect(screen.getByText('Pausa de respiração (90s)')).toBeTruthy();
    });

    it('tarefas concluídas: não desbloqueia direto, exige reflexão antes', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: true }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={90}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(
        screen.getByText('O que você vai fazer agora no Instagram?'),
      ).toBeTruthy();
    });

    it('reflexão vazia: botão Confirmar não desbloqueia', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: true }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={90}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Confirmar'));
      });

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(screen.queryByText('Liberado por 15 minutos')).toBeNull();
    });

    it('reflexão preenchida: Confirmar desbloqueia (caminho das tarefas)', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: true }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={90}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });
      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('Reflexão antes de desbloquear'),
          'Vou responder uma mensagem e fechar de novo',
        );
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Confirmar'));
      });

      expect(onDesbloquear).toHaveBeenCalledWith(15);
      expect(screen.getByText('Liberado por 15 minutos')).toBeTruthy();
    });

    it('completa os 90s de respiração: exige reflexão antes de liberar', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={90}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Pausa de respiração (90s)'));
      });

      await avancarSegundos(89);
      expect(onDesbloquear).not.toHaveBeenCalled();

      await avancarSegundos(1);

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(
        screen.getByText('O que você vai fazer agora no Instagram?'),
      ).toBeTruthy();

      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('Reflexão antes de desbloquear'),
          'Vou só ver uma notificação',
        );
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Confirmar'));
      });

      expect(onDesbloquear).toHaveBeenCalledWith(15);
      expect(screen.getByText('Liberado por 15 minutos')).toBeTruthy();
    });
  });

  describe('nível 3 (3º desbloqueio do dia em diante — teto, 120s + reflexão)', () => {
    it('mostra a duração de 120s e continua exigindo reflexão, igual ao nível 2', async () => {
      configurarTarefas({
        tarefas: [{ id: '1', titulo: 'Ler', essencial: true, concluida: true }],
      });
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={120}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      expect(screen.getByText('Pausa de respiração (120s)')).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByText('Cumprir minhas tarefas essenciais'));
      });

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Reflexão antes de desbloquear')).toBeTruthy();

      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('Reflexão antes de desbloquear'),
          'Vou responder o grupo da família',
        );
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Confirmar'));
      });

      expect(onDesbloquear).toHaveBeenCalledWith(15);
    });

    it('completa os 120s de respiração antes de liberar', async () => {
      await render(
        <AppBlockedScreen
          uid="uid-teste"
          appBloqueado={APP_BLOQUEADO}
          duracaoRespiracaoSegundos={120}
          precisaReflexao={true}
          onDesbloquear={onDesbloquear}
          onFechar={onFechar}
        />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Pausa de respiração (120s)'));
      });

      await avancarSegundos(119);
      expect(onDesbloquear).not.toHaveBeenCalled();

      await avancarSegundos(1);

      expect(onDesbloquear).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Reflexão antes de desbloquear')).toBeTruthy();
    });
  });
});
