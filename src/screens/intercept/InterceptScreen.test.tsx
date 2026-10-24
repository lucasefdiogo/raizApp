import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InterceptScreen } from './InterceptScreen';
import { Tarefa } from '../../domain/types';
import {
  CONFIG_BLOCO_PADRAO,
  ConfigBloco,
  EstadoSaldo,
  estadoInicialDia,
} from '../../domain/saldoBloqueio';

jest.mock('../../hooks/useDailyTasks');
jest.mock('../../hooks/useIntercept');
jest.mock('../../hooks/useBloqueioSaldo');
jest.mock('../../hooks/usePausaNoturna');
jest.mock('../../hooks/useVoltarFisico');
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
const { usePausaNoturna } = require('../../hooks/usePausaNoturna');
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
  config: Partial<ConfigBloco> = {},
) {
  const retorno = {
    visao: {
      estado: { ...estadoInicialDia('2026-10-11'), ...estado },
      config: { ...CONFIG_BLOCO_PADRAO, ...config },
      agora: AGORA,
    },
    agora: AGORA,
    pausaIntencaoSeg: 5,
    msRestantesSessao: 0,
    avisoUmMinuto: false,
    acessoRapidoDisponivel: false,
    esperaAcessoRapidoSeg: 5,
    acessosRapidosRestantes: 3,
    msAteProximoAcessoRapido: 0,
    emergenciaOferecida: false,
    dentroJanelaNoturna: false,
    recarregar: jest.fn(),
    liberar: jest.fn().mockResolvedValue(true),
    liberarAcessoRapido: jest.fn().mockResolvedValue(true),
    concluirEmergencia: jest.fn().mockResolvedValue(true),
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

function configurarPausaNoturna(sobrescritas: Record<string, unknown> = {}) {
  usePausaNoturna.mockReturnValue({
    carregando: false,
    noturna: false,
    duracaoSeg: 20,
    mensagem: null,
    alternativa: null,
    ...sobrescritas,
  });
}

const props = {
  uid: 'uid-1',
  packageName: 'com.instagram.android',
  appLabel: 'Instagram',
  appIconeBase64: 'abc',
  snapshot: { tarefas: [] as Tarefa[] },
  onSair: jest.fn(),
  onFecharAposAbrir: jest.fn(),
};

describe('InterceptScreen', () => {
  let registrarAcao: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    registrarAcao = jest.fn();
    useIntercept.mockReturnValue({ registrarAcao });
    abrirApp.mockResolvedValue(true);
    configurarSaldo();
    // Outside the night window by default: the HU-04 pause, duration from the saldo.
    configurarPausaNoturna();
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

    it('CA-04: mostra a pausa com a duração vinda do hook e, com limite diário, o saldo restante', async () => {
      configurarSaldo(
        { fase: 'AGUARDANDO_LIBERACAO', saldo: 0, blocosUsados: 1 },
        { pausaIntencaoSeg: 20 },
        { blocosDiarios: 6 },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.getByText('Liberar em 0:20')).toBeTruthy();
      expect(screen.getByText(/Restam 5 sessões hoje/)).toBeTruthy();
    });

    it('sem limite diário a pausa não mostra saldo restante', async () => {
      configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 3 });
      await render(<InterceptScreen {...props} />);

      expect(screen.queryByText(/Rest/)).toBeNull();
    });

    it('"Liberar" (com a pausa zerada): registra a ação, libera com a intenção, reabre o app e fecha sem forçar a Home', async () => {
      jest.useFakeTimers();
      try {
        const saldo = configurarSaldo(
          { fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
          { pausaIntencaoSeg: 5 },
        );
        const onSair = jest.fn();
        const onFecharAposAbrir = jest.fn();
        await render(
          <InterceptScreen
            {...props}
            onSair={onSair}
            onFecharAposAbrir={onFecharAposAbrir}
          />,
        );

        await fireEvent.changeText(
          screen.getByLabelText('Se quiser, escreva (opcional)'),
          'ver mensagens',
        );
        await act(async () => {
          jest.advanceTimersByTime(5000);
        });
        await act(async () => {
          await fireEvent.press(screen.getByText('Liberar 15 min'));
        });

        expect(registrarAcao).toHaveBeenCalledWith('B', 'liberou');
        expect(saldo.liberar).toHaveBeenCalledWith('ver mensagens');
        expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
        expect(onFecharAposAbrir).toHaveBeenCalledTimes(1);
        expect(onSair).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('se o nativo recusar a liberação: não reabre o app nem fecha', async () => {
      jest.useFakeTimers();
      try {
        configurarSaldo(
          { fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
          { liberar: jest.fn().mockResolvedValue(false) },
        );
        const onSair = jest.fn();
        const onFecharAposAbrir = jest.fn();
        await render(
          <InterceptScreen
            {...props}
            onSair={onSair}
            onFecharAposAbrir={onFecharAposAbrir}
          />,
        );
        await act(async () => {
          jest.advanceTimersByTime(5000);
        });
        await act(async () => {
          await fireEvent.press(screen.getByText('Liberar 15 min'));
        });

        expect(abrirApp).not.toHaveBeenCalled();
        expect(onSair).not.toHaveBeenCalled();
        expect(onFecharAposAbrir).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('"Voltar ao início" registra a ação e sai, sem liberar', async () => {
      const saldo = configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4 });
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await fireEvent.press(screen.getByText('Voltar ao início'));

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

    it('CA-03: cooldown: minutos até fimCooldownEm e os atalhos', async () => {
      configurarSaldo(
        { fase: 'COOLDOWN', saldo: 2, fimCooldownEm: AGORA + 125_000 },
        { agora: AGORA },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('3 min')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sessão de foco/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Tarefas extras/ })).toBeTruthy();
    });

    it('CA-06: com saldo zerado mostra os atalhos de sessão de foco e tarefas extras, sem pausa', async () => {
      configurarSaldo({ fase: 'SALDO_ZERADO', saldo: 0 });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('Por hoje, as sessões acabaram.')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sessão de foco/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Tarefas extras/ })).toBeTruthy();
      expect(screen.queryByText('O que você vai fazer agora?')).toBeNull();
    });

    it('CA-07: depois de uma tarefa extra concluída a próxima abertura mostra a pausa, não o saldo zerado', async () => {
      // A extra concluída virou crédito no nativo: a abertura seguinte lê AGUARDANDO_LIBERACAO.
      configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 1 });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.queryByText('Por hoje, as sessões acabaram.')).toBeNull();
    });

    it('a válvula "Sessão de foco" abre a SessaoFocoScreen de 5 min sem tarefa e sem botão de seguir pro app', async () => {
      configurarSaldo({ fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 });
      await render(<InterceptScreen {...props} />);

      await fireEvent.press(screen.getByRole('button', { name: /Sessão de foco/ }));

      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 300,
        origem: 'interceptacao',
      });
      expect(mock.tarefaId).toBeNull();
      expect(screen.queryByText('mock-liberar-app')).toBeNull();
    });

    it('a válvula "Tarefas extras" lista só extras pendentes (sem essenciais, concluídas ou subtarefas); concluir e adicionar vão pro useDailyTasks', async () => {
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

      await fireEvent.press(screen.getByRole('button', { name: /Tarefas extras/ }));

      expect(screen.getByTestId('extras-mock').props.children).toBe('extra-1');
      await fireEvent.press(screen.getByText('mock-concluir'));
      expect(alternarTarefa).toHaveBeenCalledWith('extra-1');
      await fireEvent.press(screen.getByText('mock-adicionar'));
      expect(adicionarTarefa).toHaveBeenCalledWith('Nova extra', false);

      await fireEvent.press(screen.getByText('mock-voltar'));
      expect(screen.getByText('Por hoje, as sessões acabaram.')).toBeTruthy();
    });
  });

  describe('fim de uma sessão de foco', () => {
    it('só oferece "liberar" quando há sessão a liberar (AGUARDANDO_LIBERACAO); ele leva à pausa de intenção, não libera direto', async () => {
      configurarDailyTasks({ tarefas: [] });
      const sem = configurarSaldo({ fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 });
      const { rerender } = await render(<InterceptScreen {...props} />);
      await fireEvent.press(screen.getByRole('button', { name: /Sessão de foco/ }));
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

  describe('SESSAO_ATIVA', () => {
    it('CA-03: mostra o tempo restante e o aviso 1 minuto restante quando o hook sinaliza', async () => {
      configurarDailyTasks();
      configurarSaldo(
        { fase: 'SESSAO_ATIVA' },
        { msRestantesSessao: 45_000, avisoUmMinuto: true },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('00:45')).toBeTruthy();
      expect(screen.getByText('1 minuto restante')).toBeTruthy();
      expect(screen.queryByText('Sua sessão está em andamento.')).toBeNull();
      await fireEvent.press(screen.getByText('Abrir o Instagram'));
      expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
    });

    it('CA-03: fora do último minuto não há aviso', async () => {
      configurarDailyTasks();
      configurarSaldo(
        { fase: 'SESSAO_ATIVA' },
        { msRestantesSessao: 5 * 60_000, avisoUmMinuto: false },
      );
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('05:00')).toBeTruthy();
      expect(screen.queryByText('1 minuto restante')).toBeNull();
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

    it('HU-11 Cenário 8: já dentro da janela noturna, a sessão retomada aparece direto, sem a pausa noturna', async () => {
      configurarDailyTasks({ tarefas: [] });
      configurarSaldo({}, { dentroJanelaNoturna: true });
      await render(
        <InterceptScreen
          {...props}
          sessaoAtivaResumida={{
            tarefaId: null,
            estadoTravado: null,
            duracaoRestanteSeg: 300,
          }}
        />,
      );

      expect(screen.getByTestId('sessao-foco-mock')).toBeTruthy();
      expect(usePausaNoturna).not.toHaveBeenCalled();
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

  describe('acesso rápido e emergência (HU-05)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      configurarDailyTasks({ tarefas: [] });
      jest
        .spyOn(require('react-native').AccessibilityInfo, 'isReduceMotionEnabled')
        .mockResolvedValue(false);
    });
    afterEach(() => jest.useRealTimers());

    async function passar(segundos: number) {
      for (let i = 0; i < segundos; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1_000);
        });
      }
    }

    it('CA-01: tocar em Acesso rápido (2 min) chama a liberação nativa depois da espera de 5 segundos', async () => {
      const liberarAcessoRapido = jest.fn().mockResolvedValue(true);
      configurarSaldo(
        { fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 },
        {
          acessoRapidoDisponivel: true,
          esperaAcessoRapidoSeg: 5,
          msAteProximoAcessoRapido: 0,
          emergenciaOferecida: false,
          liberarAcessoRapido,
        },
      );
      const onSair = jest.fn();
      const onFecharAposAbrir = jest.fn();
      await render(
        <InterceptScreen
          {...props}
          onSair={onSair}
          onFecharAposAbrir={onFecharAposAbrir}
        />,
      );

      await fireEvent.press(screen.getByRole('button', { name: /Acesso rápido/ }));
      await passar(4);
      expect(liberarAcessoRapido).not.toHaveBeenCalled();
      await passar(1);

      expect(liberarAcessoRapido).toHaveBeenCalledTimes(1);
      expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
      expect(onFecharAposAbrir).toHaveBeenCalledTimes(1);
      expect(onSair).not.toHaveBeenCalled();
    });

    it('CA-01: se o nativo recusar o acesso rápido, o app não abre', async () => {
      configurarSaldo(
        { fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 },
        {
          acessoRapidoDisponivel: true,
          esperaAcessoRapidoSeg: 5,
          liberarAcessoRapido: jest.fn().mockResolvedValue(false),
        },
      );
      const onSair = jest.fn();
      const onFecharAposAbrir = jest.fn();
      await render(
        <InterceptScreen
          {...props}
          onSair={onSair}
          onFecharAposAbrir={onFecharAposAbrir}
        />,
      );

      await fireEvent.press(screen.getByRole('button', { name: /Acesso rápido/ }));
      await passar(5);

      expect(abrirApp).not.toHaveBeenCalled();
      expect(onSair).not.toHaveBeenCalled();
      expect(onFecharAposAbrir).not.toHaveBeenCalled();
    });

    it('CA-07: reabrir a interceptação depois de uma emergência mostra a mesma cota de acesso rápido', async () => {
      const concluirEmergencia = jest.fn().mockResolvedValue(true);
      const cota = {
        acessoRapidoDisponivel: false,
        msAteProximoAcessoRapido: 20 * 60_000,
        emergenciaOferecida: true,
      };
      configurarSaldo(
        { fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 },
        { ...cota, concluirEmergencia },
      );
      const onSair = jest.fn();
      const onFecharAposAbrir = jest.fn();
      const { unmount } = await render(
        <InterceptScreen
          {...props}
          onSair={onSair}
          onFecharAposAbrir={onFecharAposAbrir}
        />,
      );
      expect(screen.getByText('Próximo disponível em 20 min')).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('button', { name: /Saída de emergência/ }),
      );
      expect(screen.getByText('SAÍDA DE EMERGÊNCIA')).toBeTruthy();
      expect(concluirEmergencia).not.toHaveBeenCalled();
      await passar(60);

      expect(concluirEmergencia).toHaveBeenCalledTimes(1);
      expect(abrirApp).toHaveBeenCalledWith('com.instagram.android');
      expect(onFecharAposAbrir).toHaveBeenCalledTimes(1);
      expect(onSair).not.toHaveBeenCalled();

      // Reabre: a visão nativa traz a mesma cota (a emergência não a consumiu).
      await unmount();
      configurarSaldo(
        { fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 },
        { ...cota, concluirEmergencia },
      );
      await render(<InterceptScreen {...props} />);
      expect(screen.getByText('Próximo disponível em 20 min')).toBeTruthy();
    });

    it('CA-07: se o nativo recusar a emergência, o app não abre', async () => {
      configurarSaldo(
        { fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 },
        {
          acessoRapidoDisponivel: false,
          msAteProximoAcessoRapido: 20 * 60_000,
          emergenciaOferecida: true,
          concluirEmergencia: jest.fn().mockResolvedValue(false),
        },
      );
      const onSair = jest.fn();
      const onFecharAposAbrir = jest.fn();
      await render(
        <InterceptScreen
          {...props}
          onSair={onSair}
          onFecharAposAbrir={onFecharAposAbrir}
        />,
      );
      await fireEvent.press(
        screen.getByRole('button', { name: /Saída de emergência/ }),
      );
      await passar(60);

      expect(abrirApp).not.toHaveBeenCalled();
      expect(onSair).not.toHaveBeenCalled();
      expect(onFecharAposAbrir).not.toHaveBeenCalled();
    });
  });

  describe('janela noturna (HU-06)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_CUMPRIDA] });
    });
    afterEach(() => jest.useRealTimers());

    const NOTURNA = {
      noturna: true,
      duracaoSeg: 40,
      mensagem: 'O descanso de hoje é o foco de amanhã.',
      alternativa: 'Ler um pouco',
    };

    it('CA-04: dentro da janela a pausa mostra a mensagem noturna e liberar só depois de 40 segundos', async () => {
      configurarSaldo(
        { fase: 'AGUARDANDO_LIBERACAO', saldo: 0, blocosUsados: 1 },
        { pausaIntencaoSeg: 20 },
      );
      configurarPausaNoturna(NOTURNA);
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O descanso de hoje é o foco de amanhã.')).toBeTruthy();
      expect(screen.queryByText('O que você vai fazer agora?')).toBeNull();
      expect(usePausaNoturna).toHaveBeenCalledWith('uid-1', 1);
      expect(
        screen.getByRole('button', { name: 'Liberar em 0:40' }).props.accessibilityState?.disabled,
      ).toBe(true);
      await act(async () => {
        jest.advanceTimersByTime(39000);
      });
      expect(
        screen.getByRole('button', { name: 'Liberar em 0:01' }).props.accessibilityState?.disabled,
      ).toBe(true);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(
        screen.getByRole('button', { name: 'Liberar 15 min' }).props.accessibilityState?.disabled,
      ).toBeFalsy();
    });

    it('CA-03: dentro da janela a pausa mostra o botão com a alternativa, que fecha sem liberar a sessão', async () => {
      const saldo = configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4 });
      configurarPausaNoturna(NOTURNA);
      const onSair = jest.fn();
      await render(<InterceptScreen {...props} onSair={onSair} />);

      await fireEvent.press(screen.getByRole('button', { name: 'Ler um pouco em vez disso' }));

      expect(registrarAcao).toHaveBeenCalledWith('B', 'saiu');
      expect(saldo.liberar).not.toHaveBeenCalled();
      expect(abrirApp).not.toHaveBeenCalled();
      expect(onSair).toHaveBeenCalledTimes(1);
    });

    it('CA-04: enquanto a rotina carrega mostra o carregando e não monta a pausa', async () => {
      configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4 });
      configurarPausaNoturna({ carregando: true });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.queryByTestId('intercept-layout')).toBeNull();
    });

    it('CA-06: fora da janela a pausa mostra o texto padrão da HU-04, sem botão de alternativa', async () => {
      configurarSaldo(
        { fase: 'AGUARDANDO_LIBERACAO', saldo: 4 },
        { pausaIntencaoSeg: 20 },
      );
      configurarPausaNoturna({ noturna: false, duracaoSeg: 20, alternativa: 'Ler um pouco' });
      await render(<InterceptScreen {...props} />);

      expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
      expect(screen.getByText('Liberar em 0:20')).toBeTruthy();
      expect(screen.queryByText('Ler um pouco')).toBeNull();
      expect(screen.queryByText('Você está perto do seu horário de dormir.')).toBeNull();
    });

    it('CA-06: fora da fase de pausa o hook noturno nem é consultado (a rotação não avança)', async () => {
      configurarSaldo({ fase: 'COOLDOWN', fimCooldownEm: AGORA + 60_000 });
      await render(<InterceptScreen {...props} />);

      expect(usePausaNoturna).not.toHaveBeenCalled();
    });
  });
});
