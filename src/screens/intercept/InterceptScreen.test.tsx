import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InterceptScreen } from './InterceptScreen';
import { Tarefa } from '../../domain/types';

jest.mock('../../hooks/useDailyTasks');
jest.mock('../../hooks/useIntercept');
jest.mock('../../native/AccessibilityDetection');
jest.mock('../../services/analytics');
jest.mock('./SessaoFocoScreen', () => ({
  SessaoFocoScreen: (props: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return <Text testID="sessao-foco-mock">{JSON.stringify(props)}</Text>;
  },
}));
jest.mock('./TravadoFlowScreen', () => ({
  TravadoFlowScreen: (props: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return <Text testID="travado-flow-mock">{JSON.stringify(props)}</Text>;
  },
}));

const { useDailyTasks } = require('../../hooks/useDailyTasks');
const { useIntercept } = require('../../hooks/useIntercept');
const {
  abrirApp,
  registrarDesbloqueioTemporario,
} = require('../../native/AccessibilityDetection');
const { logInterceptShown } = require('../../services/analytics');

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
  });

  describe('estado A (essencial pendente)', () => {
    beforeEach(() => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
    });

    it('mostra o texto interpolado com o app e a tarefa, e as 3 ações', async () => {
      await render(<InterceptScreen {...props} />);

      expect(
        screen.getByText(
          'Você ia abrir o Instagram. A tarefa de hoje é Abrir o material de estudo. Topa só 2 minutos dela?',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Fazer 2 minutos')).toBeTruthy();
      expect(screen.getByText('Estou travado')).toBeTruthy();
      expect(screen.getByText('Sair')).toBeTruthy();
      expect(logInterceptShown).toHaveBeenCalledWith('A');
    });

    it('"Fazer 2 minutos" registra a ação e abre a SessaoFocoScreen com 120s/interceptacao', async () => {
      await render(<InterceptScreen {...props} />);

      await fireEvent.press(screen.getByText('Fazer 2 minutos'));

      expect(registrarAcao).toHaveBeenCalledWith('A', 'sessao');
      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 120,
        tarefaId: 'tarefa-1',
        origem: 'interceptacao',
        estadoTravado: null,
        appLabel: 'Instagram',
      });
    });

    it('"Estou travado" registra a ação e abre a TravadoFlowScreen com origem travado', async () => {
      await render(<InterceptScreen {...props} />);

      await fireEvent.press(screen.getByText('Estou travado'));

      expect(registrarAcao).toHaveBeenCalledWith('A', 'travado');
      const mock = JSON.parse(screen.getByTestId('travado-flow-mock').props.children);
      expect(mock).toMatchObject({
        origem: 'travado',
        tarefaContexto: TAREFA_ESSENCIAL_PENDENTE,
      });
    });

    it('"Sair" registra a ação e chama onSair', async () => {
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await fireEvent.press(screen.getByText('Sair'));

      expect(registrarAcao).toHaveBeenCalledWith('A', 'saiu');
      expect(onSair).toHaveBeenCalledTimes(1);
    });

    it('não desbloqueia nada — nenhuma chamada nativa de liberação nesse estado', async () => {
      await render(<InterceptScreen {...props} />);
      expect(registrarDesbloqueioTemporario).not.toHaveBeenCalled();
    });
  });

  describe('estado B (essencial já cumprido)', () => {
    beforeEach(() => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_CUMPRIDA] });
    });

    it('mostra o texto com o app e as 2 ações', async () => {
      await render(<InterceptScreen {...props} />);

      expect(
        screen.getByText(
          'Você já cumpriu o essencial de hoje. Liberar o Instagram por 15 minutos?',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Liberar')).toBeTruthy();
      expect(screen.getByText('Agora não')).toBeTruthy();
      expect(logInterceptShown).toHaveBeenCalledWith('B');
    });

    it('"Liberar" registra a ação, desbloqueia 15 min, reabre o app e chama onSair', async () => {
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await act(async () => {
        await fireEvent.press(screen.getByText('Liberar'));
      });

      expect(registrarAcao).toHaveBeenCalledWith('B', 'liberou');
      expect(registrarDesbloqueioTemporario).toHaveBeenCalledWith(
        'com.instagram.android',
        15,
      );
      expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
      expect(onSair).toHaveBeenCalledTimes(1);
    });

    it('"Agora não" registra a ação e chama onSair, sem desbloquear', async () => {
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await fireEvent.press(screen.getByText('Agora não'));

      expect(registrarAcao).toHaveBeenCalledWith('B', 'saiu');
      expect(onSair).toHaveBeenCalledTimes(1);
      expect(registrarDesbloqueioTemporario).not.toHaveBeenCalled();
    });
  });

  describe('estado C (nenhuma essencial cadastrada)', () => {
    beforeEach(() => {
      configurarDailyTasks({ tarefas: [] });
    });

    it('mostra o texto e o campo, com "Continuar" desabilitado até digitar', async () => {
      await render(<InterceptScreen {...props} />);

      expect(
        screen.getByText(
          'Você ia abrir o Instagram. Antes: qual é uma coisa pequena para hoje?',
        ),
      ).toBeTruthy();
      const botao = screen.getByRole('button', { name: 'Continuar' });
      expect(botao.props.accessibilityState?.disabled).toBe(true);
      expect(logInterceptShown).toHaveBeenCalledWith('C');
    });

    it('preenchido: cria a tarefa essencial via adicionarTarefa', async () => {
      const adicionarTarefa = jest.fn();
      configurarDailyTasks({ tarefas: [], adicionarTarefa });
      await render(<InterceptScreen {...props} />);

      await fireEvent.changeText(
        screen.getByLabelText('Uma coisa pequena para hoje'),
        'Separar o material',
      );
      await fireEvent.press(screen.getByText('Continuar'));

      expect(adicionarTarefa).toHaveBeenCalledWith('Separar o material', true);
    });

    it('depois de criada (tarefas ao vivo atualizam): transita sozinho pro estado A', async () => {
      const { rerender } = await render(<InterceptScreen {...props} />);

      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
      await rerender(<InterceptScreen {...props} />);

      expect(
        screen.getByText(
          'Você ia abrir o Instagram. A tarefa de hoje é Abrir o material de estudo. Topa só 2 minutos dela?',
        ),
      ).toBeTruthy();
    });
  });

  describe('sessaoAtivaResumida (Etapa 4 — reabrir com o timer em andamento)', () => {
    it('com duracaoRestanteSeg > 0: pula a decisão A/B/C e abre a SessaoFocoScreen direto, retomando o tempo restante', async () => {
      configurarDailyTasks({ tarefas: [] }); // estaria em C se não fosse a retomada
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

      expect(screen.queryByText(/qual é uma coisa pequena/)).toBeNull();
      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 42,
        tarefaId: 'tarefa-1',
        estadoTravado: 'confusao',
        origem: 'interceptacao',
      });
      expect(logInterceptShown).not.toHaveBeenCalled();
    });

    it('com duracaoRestanteSeg <= 0: ignora e mostra a decisão A/B/C normalmente', async () => {
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

      expect(screen.getByText('Fazer 2 minutos')).toBeTruthy();
      expect(screen.queryByTestId('sessao-foco-mock')).toBeNull();
    });

    it('ausente: comportamento normal (decisão A/B/C)', async () => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('Fazer 2 minutos')).toBeTruthy();
    });
  });

  it('enquanto useDailyTasks ainda carrega, usa o snapshot pra decidir o estado instantaneamente', async () => {
    configurarDailyTasks({ tarefas: [], carregando: true });
    await render(
      <InterceptScreen
        {...props}
        snapshot={{ tarefas: [TAREFA_ESSENCIAL_PENDENTE] }}
      />,
    );

    expect(screen.getByText('Fazer 2 minutos')).toBeTruthy();
  });
});
