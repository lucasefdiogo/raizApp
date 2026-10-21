import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InterceptScreen } from './InterceptScreen';
import { Tarefa } from '../../domain/types';
import {
  CONFIG_BLOCO_PADRAO,
  EstadoSaldo,
  estadoInicialDia,
} from '../../domain/saldoBloqueio';

jest.mock('../../hooks/useDailyTasks');
jest.mock('../../hooks/useIntercept');
jest.mock('../../hooks/useBloqueioSaldo');
jest.mock('../../native/AccessibilityDetection');
jest.mock('./SessaoFocoScreen', () => ({
  SessaoFocoScreen: (props: Record<string, unknown>) => {
    const { Text, Pressable } = require('react-native');
    const onLiberarApp = props.onLiberarApp as (() => void) | undefined;
    return (
      <>
        <Text testID="sessao-foco-mock">{JSON.stringify(props)}</Text>
        {onLiberarApp && (
          <Pressable onPress={onLiberarApp}>
            <Text>mock-liberar-app</Text>
          </Pressable>
        )}
      </>
    );
  },
}));
jest.mock('./TarefasExtrasScreen', () => ({
  TarefasExtrasScreen: (props: {
    tarefas: Tarefa[];
    onConcluir: (id: string) => void;
    onAdicionar: (titulo: string) => void;
    onVoltar: () => void;
  }) => {
    const { Text, Pressable } = require('react-native');
    return (
      <>
        <Text testID="extras-mock">
          {props.tarefas.map(t => t.id).join(',')}
        </Text>
        <Pressable onPress={() => props.onConcluir('extra-1')}>
          <Text>mock-concluir</Text>
        </Pressable>
        <Pressable onPress={() => props.onAdicionar('Nova extra')}>
          <Text>mock-adicionar</Text>
        </Pressable>
        <Pressable onPress={props.onVoltar}>
          <Text>mock-voltar</Text>
        </Pressable>
      </>
    );
  },
}));

const { useDailyTasks } = require('../../hooks/useDailyTasks');
const { useIntercept } = require('../../hooks/useIntercept');
const { useBloqueioSaldo } = require('../../hooks/useBloqueioSaldo');
const { abrirApp } = require('../../native/AccessibilityDetection');

const TAREFA_ESSENCIAL_PENDENTE: Tarefa = {
  id: 'tarefa-1',
  titulo: 'Abrir o material de estudo',
  essencial: true,
  concluida: false,
};

const TAREFA_ESSENCIAL_CUMPRIDA: Tarefa = {
  id: 'tarefa-1',
  titulo: 'Abrir o material de estudo',
  essencial: true,
  concluida: true,
};

function configurarDailyTasks(sobrescritas: Record<string, unknown> = {}) {
  useDailyTasks.mockReturnValue({
    tarefas: [],
    alternarTarefa: jest.fn(),
    adicionarTarefa: jest.fn(),
    editarTarefa: jest.fn(),
    removerTarefa: jest.fn(),
    criarSubtarefa: jest.fn(),
    moverTarefaParaAmanha: jest.fn(),
    statusDia: 'pendente',
    carregando: false,
    limiteEssenciaisAtingido: false,
    recarregar: jest.fn(),
    ...sobrescritas,
  });
}

const AGORA = 1_700_000_000_000;

function configurarSaldo(
  estado: Partial<EstadoSaldo> = {},
  sobrescritas: Record<string, unknown> = {},
) {
  const retorno = {
    visao: {
      estado: { ...estadoInicialDia('2026-10-11'), ...estado },
      config: CONFIG_BLOCO_PADRAO,
      agora: AGORA,
    },
    agora: AGORA,
    pausaIntencaoSeg: 5,
    recarregar: jest.fn(),
    liberar: jest.fn().mockResolvedValue(true),
    ...sobrescritas,
  };
  useBloqueioSaldo.mockReturnValue(retorno);
  return retorno;
}

/** Nativo ainda sem responder e sem visão inicial: a tela cai na pausa, nunca nos estados A/C. */
function configurarSaldoSemVisao() {
  useBloqueioSaldo.mockReturnValue({
    visao: null,
    agora: AGORA,
    pausaIntencaoSeg: 10,
    recarregar: jest.fn(),
    liberar: jest.fn().mockResolvedValue(true),
  });
}

const props = {
  uid: 'uid-1',
  packageName: 'com.instagram.android',
  appLabel: 'Instagram',
  snapshot: { tarefas: [] as Tarefa[] },
  onSair: jest.fn(),
};

describe('InterceptScreen', () => {
  let registrarAcao: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    registrarAcao = jest.fn();
    useIntercept.mockReturnValue({ registrarAcao });
    abrirApp.mockResolvedValue(true);
    configurarSaldo();
  });

  describe('abertura sem sessão nem cooldown (RN-01, RN-07)', () => {
    it('CA-01: sem sessão nem cooldown ativos a interceptação mostra a pausa de intenção, não os estados A/C', async () => {
      configurarSaldoSemVisao();
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByText('Fazer 2 minutos')).toBeNull();
      expect(screen.queryByText(/Topa só 2 minutos/)).toBeNull();
    });

    it('CA-01: sem nenhuma tarefa cadastrada a pausa de intenção também aparece, sem pedir uma tarefa', async () => {
      configurarSaldoSemVisao();
      configurarDailyTasks({ tarefas: [] });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByText(/qual é uma coisa pequena/)).toBeNull();
    });

    it('CA-01: a interceptação não oferece mais o botão Estou travado', async () => {
      configurarSaldoSemVisao();
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByText('Estou travado')).toBeNull();
    });
  });

  describe('AGUARDANDO_LIBERACAO (pausa de intenção)', () => {
    beforeEach(() => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_CUMPRIDA] });
    });

    it('mostra a pausa com a duração e o saldo vindos do estado', async () => {
      configurarSaldo(
        { fase: 'AGUARDANDO_LIBERACAO', saldo: 3, blocosUsados: 2 },
        { pausaIntencaoSeg: 20 },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.getByText('Liberar em 20s')).toBeTruthy();
      expect(screen.getByText(/Restam 3 blocos hoje/)).toBeTruthy();
    });

    it('"Liberar" (com a pausa zerada): registra a ação, libera com a intenção, reabre o app e sai', async () => {
      jest.useFakeTimers();
      try {
        const saldo = configurarSaldo(
          { fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
          { pausaIntencaoSeg: 5 },
        );
        const onSair = jest.fn();
        await render(<InterceptScreen {...props} onSair={onSair} />);

        await fireEvent.changeText(
          screen.getByLabelText('Se quiser, escreva (opcional)'),
          'ver mensagens',
        );
        await act(async () => {
          jest.advanceTimersByTime(5000);
        });
        await act(async () => {
          await fireEvent.press(screen.getByText('Liberar'));
        });

        expect(registrarAcao).toHaveBeenCalledWith('B', 'liberou');
        expect(saldo.liberar).toHaveBeenCalledWith('ver mensagens');
        expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
        expect(onSair).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('se o nativo recusar a liberação: não reabre o app nem sai', async () => {
      jest.useFakeTimers();
      try {
        configurarSaldo(
          { fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
          { liberar: jest.fn().mockResolvedValue(false) },
        );
        const onSair = jest.fn();
        await render(<InterceptScreen {...props} onSair={onSair} />);
        await act(async () => {
          jest.advanceTimersByTime(5000);
        });
        await act(async () => {
          await fireEvent.press(screen.getByText('Liberar'));
        });

        expect(abrirApp).not.toHaveBeenCalled();
        expect(onSair).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('"Agora não" registra a ação e sai, sem liberar', async () => {
      const saldo = configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4 });
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await fireEvent.press(screen.getByText('Agora não'));

      expect(registrarAcao).toHaveBeenCalledWith('B', 'saiu');
      expect(saldo.liberar).not.toHaveBeenCalled();
      expect(onSair).toHaveBeenCalledTimes(1);
    });
  });

  describe('COOLDOWN e SALDO_ZERADO', () => {
    beforeEach(() => {
      configurarDailyTasks({
        tarefas: [
          TAREFA_ESSENCIAL_CUMPRIDA,
          { id: 'extra-1', titulo: 'Regar a planta', essencial: false, concluida: false },
          { id: 'extra-2', titulo: 'Feita', essencial: false, concluida: true },
          { id: 'sub-1', titulo: 'Sub', essencial: false, concluida: false, tarefaPaiId: 'tarefa-1' },
        ],
      });
    });

    it('cooldown: contagem regressiva até fimCooldownEm e os atalhos', async () => {
      configurarSaldo(
        { fase: 'COOLDOWN', saldo: 2, fimCooldownEm: AGORA + 125_000 },
        { agora: AGORA },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('Próximo bloco em')).toBeTruthy();
      expect(screen.getByTestId('espera-contagem').props.children).toBe('02:05');
      expect(screen.getByText('Iniciar uma sessão de foco')).toBeTruthy();
      expect(screen.getByText('Ver tarefas extras')).toBeTruthy();
    });

    it('CA-06: com saldo zerado mostra os atalhos de sessão de foco e tarefas extras, sem pausa', async () => {
      configurarSaldo({ fase: 'SALDO_ZERADO', saldo: 0 });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('Os blocos de hoje acabaram')).toBeTruthy();
      expect(screen.getByText(/volta a ficar disponível amanhã/)).toBeTruthy();
      expect(screen.getByText('Iniciar uma sessão de foco')).toBeTruthy();
      expect(screen.getByText('Ver tarefas extras')).toBeTruthy();
      expect(screen.queryByText('O que você vai fazer agora?')).toBeNull();
    });

    it('CA-07: depois de uma tarefa extra concluída a próxima abertura mostra a pausa, não o saldo zerado', async () => {
      // A extra concluída virou crédito no nativo: a abertura seguinte lê AGUARDANDO_LIBERACAO.
      configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 1 });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByText('Os blocos de hoje acabaram')).toBeNull();
      expect(screen.queryByText('Ver tarefas extras')).toBeNull();
    });

    it('"Iniciar uma sessão de foco" abre a SessaoFocoScreen de 5 min sem tarefa e sem botão de seguir pro app', async () => {
      configurarSaldo({ fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 });
      await render(<InterceptScreen {...props} />);

      await fireEvent.press(screen.getByText('Iniciar uma sessão de foco'));

      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 300,
        origem: 'interceptacao',
      });
      expect(mock.tarefaId).toBeNull();
      expect(screen.queryByText('mock-liberar-app')).toBeNull();
    });

    it('"Ver tarefas extras" lista só extras pendentes (sem essenciais, concluídas ou subtarefas); concluir e adicionar vão pro useDailyTasks', async () => {
      const alternarTarefa = jest.fn();
      const adicionarTarefa = jest.fn();
      configurarDailyTasks({
        alternarTarefa,
        adicionarTarefa,
        tarefas: [
          TAREFA_ESSENCIAL_CUMPRIDA,
          { id: 'extra-1', titulo: 'Regar a planta', essencial: false, concluida: false },
          { id: 'extra-2', titulo: 'Feita', essencial: false, concluida: true },
          { id: 'sub-1', titulo: 'Sub', essencial: false, concluida: false, tarefaPaiId: 'tarefa-1' },
        ],
      });
      configurarSaldo({ fase: 'SALDO_ZERADO' });
      await render(<InterceptScreen {...props} />);

      await fireEvent.press(screen.getByText('Ver tarefas extras'));

      expect(screen.getByTestId('extras-mock').props.children).toBe('extra-1');
      await fireEvent.press(screen.getByText('mock-concluir'));
      expect(alternarTarefa).toHaveBeenCalledWith('extra-1');
      await fireEvent.press(screen.getByText('mock-adicionar'));
      expect(adicionarTarefa).toHaveBeenCalledWith('Nova extra', false);

      await fireEvent.press(screen.getByText('mock-voltar'));
      expect(screen.getByText('Os blocos de hoje acabaram')).toBeTruthy();
    });
  });

  describe('fim de uma sessão de foco', () => {
    it('só oferece "liberar" quando há sessão a liberar (AGUARDANDO_LIBERACAO); ele leva à pausa de intenção, não libera direto', async () => {
      configurarDailyTasks({ tarefas: [] });
      const sem = configurarSaldo({ fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 });
      const { rerender } = await render(<InterceptScreen {...props} />);
      await fireEvent.press(screen.getByText('Iniciar uma sessão de foco'));
      expect(screen.queryByText('mock-liberar-app')).toBeNull();

      // O cooldown acabou enquanto a sessão de foco rodava.
      configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4 });
      await rerender(<InterceptScreen {...props} />);
      expect(screen.getByTestId('sessao-foco-mock')).toBeTruthy();

      await fireEvent.press(screen.getByText('mock-liberar-app'));

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(sem.liberar).not.toHaveBeenCalled();
      expect(abrirApp).not.toHaveBeenCalled();
    });
  });

  describe('sessaoAtivaResumida (reabrir com o timer em andamento)', () => {
    it('com duracaoRestanteSeg > 0: abre a SessaoFocoScreen direto, retomando o tempo restante', async () => {
      configurarDailyTasks({ tarefas: [] });
      await render(
        <InterceptScreen
          {...props}
          sessaoAtivaResumida={{
            tarefaId: 'tarefa-1',
            estadoTravado: 'confusao',
            duracaoRestanteSeg: 42,
          }}
        />,
      );

      expect(screen.queryByText('O que você vai fazer agora?')).toBeNull();
      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 42,
        tarefaId: 'tarefa-1',
        estadoTravado: 'confusao',
        origem: 'interceptacao',
      });
    });

    it('com duracaoRestanteSeg <= 0: ignora e mostra a pausa de intenção', async () => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
      await render(
        <InterceptScreen
          {...props}
          sessaoAtivaResumida={{
            tarefaId: 'tarefa-1',
            estadoTravado: 'confusao',
            duracaoRestanteSeg: 0,
          }}
        />,
      );

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByTestId('sessao-foco-mock')).toBeNull();
    });
  });
});
