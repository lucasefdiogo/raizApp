import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InterceptScreen } from './InterceptScreen';
import { Tarefa } from '../../domain/types';
import {
  CONFIG_BLOCO_PADRAO,
  EstadoSaldo,
  estadoInicialSaldo,
} from '../../domain/saldoBloqueio';

jest.mock('../../hooks/useDailyTasks');
jest.mock('../../hooks/useIntercept');
jest.mock('../../hooks/useBloqueioSaldo');
jest.mock('../../native/AccessibilityDetection');
jest.mock('../../services/analytics');
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
jest.mock('./TravadoFlowScreen', () => ({
  TravadoFlowScreen: (props: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return <Text testID="travado-flow-mock">{JSON.stringify(props)}</Text>;
  },
}));

const { useDailyTasks } = require('../../hooks/useDailyTasks');
const { useIntercept } = require('../../hooks/useIntercept');
const { useBloqueioSaldo } = require('../../hooks/useBloqueioSaldo');
const { abrirApp } = require('../../native/AccessibilityDetection');
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

const AGORA = 1_700_000_000_000;

function configurarSaldo(
  estado: Partial<EstadoSaldo> = {},
  sobrescritas: Record<string, unknown> = {},
) {
  const retorno = {
    visao: {
      estado: { ...estadoInicialSaldo('2026-10-11'), ...estado },
      config: CONFIG_BLOCO_PADRAO,
      agora: AGORA,
    },
    agora: AGORA,
    pausaIntencaoSeg: 5,
    podeTolerancia: true,
    recarregar: jest.fn(),
    liberar: jest.fn().mockResolvedValue(true),
    aceitarTolerancia: jest.fn().mockResolvedValue(true),
    recusarTolerancia: jest.fn().mockResolvedValue(true),
    ...sobrescritas,
  };
  useBloqueioSaldo.mockReturnValue(retorno);
  return retorno;
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
  });

  describe('essencial cumprido, saldo ainda não creditado pelo nativo', () => {
    it('mostra um aviso curto e só oferece sair — nunca libera sem o nativo', async () => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_CUMPRIDA] });
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      expect(screen.getByText(/Estamos contando seus blocos/)).toBeTruthy();
      expect(screen.queryByText('Liberar')).toBeNull();
      expect(logInterceptShown).toHaveBeenCalledWith('B');

      await fireEvent.press(screen.getByText('Sair'));
      expect(registrarAcao).toHaveBeenCalledWith('B', 'saiu');
      expect(onSair).toHaveBeenCalledTimes(1);
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

  describe('TOLERANCIA (tempo esgotado)', () => {
    beforeEach(() => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_CUMPRIDA] });
    });

    it('oferta pendente: mostra "Tempo esgotado" e "+2 min para finalizar"', async () => {
      configurarSaldo({ fase: 'TOLERANCIA', toleranciaAtiva: false });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('Tempo esgotado')).toBeTruthy();
      expect(screen.getByText('+2 min para finalizar')).toBeTruthy();
    });

    it('"+2 min" concede a tolerância, reabre o app e sai', async () => {
      const saldo = configurarSaldo({ fase: 'TOLERANCIA' });
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await act(async () => {
        await fireEvent.press(screen.getByText('+2 min para finalizar'));
      });

      expect(saldo.aceitarTolerancia).toHaveBeenCalledTimes(1);
      expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
      expect(onSair).toHaveBeenCalledTimes(1);
    });

    it('"Agora não" recusa a tolerância (cooldown começa) sem reabrir o app', async () => {
      const saldo = configurarSaldo({ fase: 'TOLERANCIA' });
      await render(<InterceptScreen {...props} />);

      await fireEvent.press(screen.getByText('Agora não'));

      expect(saldo.recusarTolerancia).toHaveBeenCalledTimes(1);
      expect(abrirApp).not.toHaveBeenCalled();
    });

    it('tolerância já usada: só oferece sair', async () => {
      configurarSaldo(
        { fase: 'TOLERANCIA', toleranciaUsada: true },
        { podeTolerancia: false },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.queryByText('+2 min para finalizar')).toBeNull();
      expect(screen.getByText('Sair')).toBeTruthy();
    });

    it('tolerância correndo (toleranciaAtiva): não mostra "Tempo esgotado", só o bloco em andamento', async () => {
      configurarSaldo({ fase: 'TOLERANCIA', toleranciaAtiva: true });
      await render(<InterceptScreen {...props} />);

      expect(screen.queryByText('Tempo esgotado')).toBeNull();
      expect(screen.getByText('Seu bloco está em andamento.')).toBeTruthy();
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

    it('saldo zerado: bloqueio até amanhã, mesmos atalhos', async () => {
      configurarSaldo({ fase: 'SALDO_ZERADO', saldo: 0 });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('Os blocos de hoje acabaram')).toBeTruthy();
      expect(screen.getByText(/volta a ficar disponível amanhã/)).toBeTruthy();
      expect(screen.getByText('Ver tarefas extras')).toBeTruthy();
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
    it('só oferece "liberar" quando há bloco a liberar (AGUARDANDO_LIBERACAO); ele leva à pausa de intenção, não libera direto', async () => {
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
      const sem = configurarSaldo({ fase: 'BLOQUEADO_SEM_ESSENCIAL' });
      const { rerender } = await render(<InterceptScreen {...props} />);
      await fireEvent.press(screen.getByText('Fazer 2 minutos'));
      expect(screen.queryByText('mock-liberar-app')).toBeNull();

      // O nativo creditou o saldo enquanto a sessão rodava.
      configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4 });
      await rerender(<InterceptScreen {...props} />);
      expect(screen.getByTestId('sessao-foco-mock')).toBeTruthy();

      await fireEvent.press(screen.getByText('mock-liberar-app'));

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(sem.liberar).not.toHaveBeenCalled();
      expect(abrirApp).not.toHaveBeenCalled();
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
