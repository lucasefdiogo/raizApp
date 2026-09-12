import React from 'react';
import { Keyboard, ScrollView, StyleSheet } from 'react-native';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './HomeScreen';

// TaskItem monta TaskActionsSheet (long-press), que lê useSafeAreaInsets
// pra dar espaço ao "Cancelar" acima da barra de gestos do Android (ver
// TaskActionsSheet.tsx) — precisa do Provider, mesmo nos testes que não
// mexem com o menu de ações.
function render(ui: React.ReactElement) {
  return rtlRender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

jest.mock('../utils/taskFeedbackMessages');
const {
  obterMensagemTarefaConcluida,
} = require('../utils/taskFeedbackMessages');

jest.mock('../services/firestore');
const { buscarSystemMessage } = require('../services/firestore');

jest.mock('../hooks/useAppBlockConfig');
const { useAppBlockConfig } = require('../hooks/useAppBlockConfig');

jest.mock('../hooks/useAppBlockBannerDismissido');
const {
  useAppBlockBannerDismissido,
} = require('../hooks/useAppBlockBannerDismissido');

jest.mock('../hooks/useRecarregarAoFocar');
const { useRecarregarAoFocar } = require('../hooks/useRecarregarAoFocar');

jest.mock('../hooks/useNomeUsuario');
const { useNomeUsuario } = require('../hooks/useNomeUsuario');

// useDailyTasks tem seus próprios testes cobrindo a integração com o
// Firestore (src/hooks/useDailyTasks.test.ts) — aqui reimplementamos só o
// suficiente com useState real + as funções puras de domain/ pra exercitar
// a orquestração da HomeScreen (toggle, adicionar, editar, overlay, alerta
// de risco) sem depender de Firestore/async.
jest.mock('../hooks/useDailyTasks', () => {
  const { useState } = require('react');
  const { calcularStatusDia } = require('../domain/streak');
  const {
    adicionarTarefa: adicionarNoDia,
    editarTarefa: editarNoDia,
    removerTarefa: removerNoDia,
    limiteEssenciaisAtingido,
  } = require('../domain/dailyTasks');

  const TAREFAS_MOCK = [
    {
      id: '1',
      titulo: 'Abrir o material de estudo por 5 minutos',
      essencial: true,
      concluida: false,
    },
    {
      id: '2',
      titulo: 'Guardar o celular durante o almoço',
      essencial: false,
      concluida: false,
    },
    {
      id: '3',
      titulo: 'Escrever uma frase sobre o que pretende fazer hoje',
      essencial: false,
      concluida: false,
    },
  ];

  return {
    useDailyTasks: jest.fn(() => {
      const [tarefas, setTarefas] = useState(TAREFAS_MOCK);
      const recarregar = jest.fn().mockResolvedValue(undefined);

      const alternarTarefa = (id: string) => {
        setTarefas((atual: typeof TAREFAS_MOCK) =>
          atual.map(tarefa =>
            tarefa.id === id ? { ...tarefa, concluida: !tarefa.concluida } : tarefa,
          ),
        );
      };
      const adicionarTarefa = (titulo: string, essencial: boolean) => {
        const resultado = adicionarNoDia(tarefas, {
          id: `nova-${tarefas.length}`,
          titulo,
          essencial,
          concluida: false,
        });
        if (resultado.ok) {
          setTarefas(resultado.tarefas);
        }
      };
      const editarTarefa = (
        id: string,
        campos: { titulo?: string; essencial?: boolean },
      ) => {
        const resultado = editarNoDia(tarefas, id, campos);
        if (resultado.ok) {
          setTarefas(resultado.tarefas);
        }
      };
      const removerTarefa = (id: string) => {
        setTarefas(removerNoDia(tarefas, id));
      };

      return {
        tarefas,
        alternarTarefa,
        adicionarTarefa,
        editarTarefa,
        removerTarefa,
        statusDia: calcularStatusDia(tarefas),
        carregando: false,
        limiteEssenciaisAtingido: limiteEssenciaisAtingido(tarefas),
        recarregar,
      };
    }),
  };
});

const { useDailyTasks } = require('../hooks/useDailyTasks');

const PROPS_PADRAO = {
  uid: 'uid-teste',
  streakAtual: 4,
  escudosDisponiveis: 1,
  marcoAtingido: null,
  avaliarAlertaRisco: jest.fn(),
  recarregarStreak: jest.fn().mockResolvedValue(undefined),
  aoAbrirBloqueioApps: jest.fn(),
};

const CONFIG_BLOQUEIO_PADRAO = {
  appsInstalados: [],
  configAtual: {
    ativo: false,
    appsSelecionados: [],
    horarioInicio: null,
    horarioFim: null,
  },
  carregando: false,
  ativoAgora: false,
  alternarApp: jest.fn(),
  salvarHorario: jest.fn(),
  alternarAtivo: jest.fn(),
  recarregar: jest.fn(),
};

beforeEach(() => {
  obterMensagemTarefaConcluida.mockClear();
  obterMensagemTarefaConcluida.mockReturnValue('Feito. Isso conta.');
  buscarSystemMessage.mockReset();
  buscarSystemMessage.mockResolvedValue({
    titulo: 'Sete dias seguidos',
    corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
  });
  // Padrão: banner e status card ficam fora do caminho dos testes que não
  // são sobre bloqueio de apps — 0 apps selecionados normalmente mostraria
  // o banner, então o "dispensado hoje" cobre esse caso por padrão.
  useAppBlockConfig.mockReturnValue(CONFIG_BLOQUEIO_PADRAO);
  useAppBlockBannerDismissido.mockReturnValue({
    dispensadoHoje: true,
    carregando: false,
    dispensarHoje: jest.fn(),
  });
  useNomeUsuario.mockReturnValue('Ana');
});

describe('HomeScreen', () => {
  it('mostra a mensagem de dia pendente antes de qualquer tarefa concluída', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(screen.getByText('O dia ainda está começando.')).toBeTruthy();
  });

  it('mostra a mensagem de dia cumprido ao concluir a tarefa essencial', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    await fireEvent.press(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    );
    expect(screen.getByText('Dia cumprido. Isso já conta.')).toBeTruthy();
  });

  it('mostra o streak e as proteções recebidas via prop', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('1 proteção disponível')).toBeTruthy();
  });

  it('regressão: HomeHeader recebe o nome (useNomeUsuario) e o streakAtual (prop) corretos', async () => {
    useNomeUsuario.mockReturnValue('Marina');
    await render(<HomeScreen {...PROPS_PADRAO} streakAtual={9} />);

    // O texto exato da saudação varia por horário (ver HomeHeader.test.tsx)
    // — aqui só importa que o nome vindo do hook chegou ao componente.
    expect(screen.getByText(/Marina/)).toBeTruthy();
    expect(screen.getByText('🌱 9 dias')).toBeTruthy();
  });

  it('adiciona uma tarefa nova pela Home e ela aparece na lista', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);

    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      'Revisar o resumo da aula',
    );
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(screen.getByText('Revisar o resumo da aula')).toBeTruthy();
  });

  it('remove uma tarefa pela Home (long-press → Excluir) e ela some da lista', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(
      screen.getByText('Guardar o celular durante o almoço'),
    ).toBeTruthy();

    await fireEvent(
      screen.getByText('Guardar o celular durante o almoço'),
      'longPress',
    );
    await fireEvent.press(screen.getByText('Excluir'));

    expect(screen.queryByText('Guardar o celular durante o almoço')).toBeNull();
    expect(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    ).toBeTruthy();
  });

  it('quando todas as tarefas são removidas, mostra o EmptyState — sem CTA redundante, só o campo do AddTaskForm', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(screen.queryByTestId('empty-state')).toBeNull();

    for (const titulo of [
      'Abrir o material de estudo por 5 minutos',
      'Guardar o celular durante o almoço',
      'Escrever uma frase sobre o que pretende fazer hoje',
    ]) {
      await fireEvent(screen.getByText(titulo), 'longPress');
      await fireEvent.press(screen.getByText('Excluir'));
      expect(screen.queryByText(titulo)).toBeNull();
    }

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('Nenhuma tarefa ainda')).toBeTruthy();
    // o EmptyState não tem botão de adicionar — o AddTaskForm logo abaixo já é
    // o caminho, ter os dois era redundante
    expect(screen.queryByText('+ adicionar tarefa')).toBeNull();
    expect(screen.getByLabelText('Nova tarefa')).toBeTruthy();
    expect(screen.getByText('Adicionar tarefa')).toBeTruthy();
  });

  it('quando o teclado abre, cria espaço no fim da lista e rola até lá (campo acima do teclado)', async () => {
    const ouvintes: Record<string, (evento: unknown) => void> = {};
    const addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      evento: string,
      cb: (e: unknown) => void,
    ) => {
      ouvintes[evento] = cb;
      return { remove: jest.fn() };
    }) as never);
    const scrollToEnd = jest
      .spyOn(ScrollView.prototype, 'scrollToEnd')
      .mockImplementation(() => {});

    const paddingBottomAtual = () =>
      StyleSheet.flatten(
        screen.getByTestId('home-scroll').props.contentContainerStyle,
      ).paddingBottom;

    try {
      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(paddingBottomAtual()).toBeUndefined();

      await act(async () => {
        ouvintes.keyboardDidShow?.({ endCoordinates: { height: 320 } });
      });

      expect(paddingBottomAtual()).toBeGreaterThanOrEqual(320);

      await waitFor(() =>
        expect(scrollToEnd).toHaveBeenCalledWith({ animated: true }),
      );

      await act(async () => {
        ouvintes.keyboardDidHide?.({});
      });

      expect(paddingBottomAtual()).toBeUndefined();
    } finally {
      addListener.mockRestore();
      scrollToEnd.mockRestore();
    }
  });

  it('ao atingir 3 essenciais pela Home, mostra o aviso do teto (antes não aparecia)', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    const aviso = 'Só dá pra marcar até 3 tarefas essenciais por dia';

    expect(screen.queryByText(aviso)).toBeNull();

    // TAREFAS_MOCK já tem 1 essencial; adiciona mais 2 (teto = 3)
    for (const titulo of ['Essencial dois', 'Essencial três']) {
      await fireEvent.changeText(screen.getByLabelText('Nova tarefa'), titulo);
      await fireEvent.press(screen.getByText('Marcar como essencial'));
      await fireEvent.press(screen.getByText('Adicionar tarefa'));
    }

    expect(screen.getByText(aviso)).toBeTruthy();
    expect(screen.getByText('Essencial dois')).toBeTruthy();
    expect(screen.getByText('Essencial três')).toBeTruthy();
  });

  it('mostra o overlay com a mensagem de reforço ao concluir uma tarefa', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    await fireEvent.press(
      screen.getByText('Guardar o celular durante o almoço'),
    );

    expect(screen.getByText('Feito. Isso conta.')).toBeTruthy();
    expect(obterMensagemTarefaConcluida).toHaveBeenCalledTimes(1);
  });

  it('não dispara o overlay ao desmarcar uma tarefa já concluída', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    const tarefa = screen.getByText('Guardar o celular durante o almoço');

    await fireEvent.press(tarefa); // marca como concluída
    expect(obterMensagemTarefaConcluida).toHaveBeenCalledTimes(1);

    await fireEvent.press(tarefa); // desmarca
    expect(obterMensagemTarefaConcluida).toHaveBeenCalledTimes(1);
  });

  it('mostra o modal de marco quando marcoAtingido vem preenchido via prop', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} marcoAtingido={7} />);

    await waitFor(() => expect(screen.getByText('Marco atingido')).toBeTruthy());
    expect(
      screen.getByText(
        'Uma semana inteira sustentando o combinado com você mesmo.',
      ),
    ).toBeTruthy();
  });

  it('fecha o modal de marco ao tocar em Continuar e não reaparece', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} marcoAtingido={7} />);
    await waitFor(() => expect(screen.getByText('Marco atingido')).toBeTruthy());

    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.queryByText('Marco atingido')).toBeNull();
  });

  it('chama avaliarAlertaRisco(false) ao montar, sem nenhuma essencial concluída', async () => {
    const avaliarAlertaRisco = jest.fn();
    await render(
      <HomeScreen {...PROPS_PADRAO} avaliarAlertaRisco={avaliarAlertaRisco} />,
    );

    expect(avaliarAlertaRisco).toHaveBeenCalledWith(false);
  });

  it('chama avaliarAlertaRisco(true) ao concluir a tarefa essencial', async () => {
    const avaliarAlertaRisco = jest.fn();
    await render(
      <HomeScreen {...PROPS_PADRAO} avaliarAlertaRisco={avaliarAlertaRisco} />,
    );

    await fireEvent.press(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    );

    expect(avaliarAlertaRisco).toHaveBeenLastCalledWith(true);
  });

  it('mostra o LoadingIndicator inline enquanto useDailyTasks carrega, com o header já visível e sem a lista', async () => {
    useDailyTasks.mockReturnValueOnce({
      tarefas: [],
      alternarTarefa: jest.fn(),
      adicionarTarefa: jest.fn(),
      editarTarefa: jest.fn(),
      removerTarefa: jest.fn(),
      statusDia: 'pendente',
      carregando: true,
      limiteEssenciaisAtingido: false,
      recarregar: jest.fn().mockResolvedValue(undefined),
    });

    await render(<HomeScreen {...PROPS_PADRAO} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    // o header (streak + título) já aparece — variante inline
    expect(screen.getByText('Tarefas de hoje')).toBeTruthy();
    expect(
      screen.queryByText('Abrir o material de estudo por 5 minutos'),
    ).toBeNull();
    expect(screen.queryByText('Adicionar tarefa')).toBeNull();
  });

  it('tem RefreshControl e o puxar-pra-atualizar aciona recarregar() das tarefas e do streak', async () => {
    const recarregar = jest.fn().mockResolvedValue(undefined);
    const recarregarStreak = jest.fn().mockResolvedValue(undefined);
    // impl estática (sem hooks) durante este teste — o refresh dispara
    // re-renders e o factory padrão do mock chamaria hooks fora de ordem.
    const implPadrao = useDailyTasks.getMockImplementation();
    useDailyTasks.mockImplementation(() => ({
      tarefas: [],
      alternarTarefa: jest.fn(),
      adicionarTarefa: jest.fn(),
      editarTarefa: jest.fn(),
      removerTarefa: jest.fn(),
      statusDia: 'pendente',
      carregando: false,
      limiteEssenciaisAtingido: false,
      recarregar,
    }));

    try {
      await render(
        <HomeScreen {...PROPS_PADRAO} recarregarStreak={recarregarStreak} />,
      );

      const scroll = screen.getByTestId('home-scroll');
      expect(scroll.props.refreshControl).toBeTruthy();

      await act(async () => {
        await scroll.props.refreshControl.props.onRefresh();
      });

      expect(recarregar).toHaveBeenCalledTimes(1);
      expect(recarregarStreak).toHaveBeenCalledTimes(1);
    } finally {
      useDailyTasks.mockImplementation(implPadrao);
    }
  });

  describe('visibilidade do bloqueio de apps', () => {
    it('nunca configurou (0 apps) e não dispensou hoje: mostra o banner, não o status card', async () => {
      useAppBlockConfig.mockReturnValue(CONFIG_BLOQUEIO_PADRAO);
      useAppBlockBannerDismissido.mockReturnValue({
        dispensadoHoje: false,
        carregando: false,
        dispensarHoje: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(screen.getByTestId('app-block-banner')).toBeTruthy();
      expect(screen.queryByTestId('app-block-status-card')).toBeNull();
    });

    it('já configurou (apps > 0): mostra o status card, não o banner — mesmo sem dispensar', async () => {
      useAppBlockConfig.mockReturnValue({
        ...CONFIG_BLOQUEIO_PADRAO,
        appsInstalados: [
          { packageName: 'com.whatsapp', nome: 'WhatsApp', icone: null },
        ],
        configAtual: {
          ativo: true,
          appsSelecionados: ['com.whatsapp'],
          horarioInicio: '09:00',
          horarioFim: '18:00',
        },
        ativoAgora: true,
      });
      useAppBlockBannerDismissido.mockReturnValue({
        dispensadoHoje: false,
        carregando: false,
        dispensarHoje: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(screen.getByTestId('app-block-status-card')).toBeTruthy();
      expect(screen.queryByTestId('app-block-banner')).toBeNull();
    });

    it('apps selecionados mas o toggle geral está desligado: mostra "Bloqueio desativado", não "Bloqueio começa às"', async () => {
      useAppBlockConfig.mockReturnValue({
        ...CONFIG_BLOQUEIO_PADRAO,
        appsInstalados: [
          { packageName: 'com.whatsapp', nome: 'WhatsApp', icone: null },
        ],
        configAtual: {
          ativo: false,
          appsSelecionados: ['com.whatsapp'],
          horarioInicio: '09:00',
          horarioFim: '18:00',
        },
        ativoAgora: false,
      });
      useAppBlockBannerDismissido.mockReturnValue({
        dispensadoHoje: false,
        carregando: false,
        dispensarHoje: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(screen.getByText('Bloqueio desativado')).toBeTruthy();
      expect(screen.queryByText('Bloqueio começa às 09:00')).toBeNull();
      expect(screen.queryByTestId('app-block-banner')).toBeNull();
    });

    it('recarrega a config de bloqueio sempre que a Home ganha foco (volta de editar em outra tela)', async () => {
      useAppBlockConfig.mockReturnValue(CONFIG_BLOQUEIO_PADRAO);

      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(useRecarregarAoFocar).toHaveBeenCalledWith(
        CONFIG_BLOQUEIO_PADRAO.recarregar,
      );
    });

    it('nunca configurou, mas já dispensou o banner hoje: não mostra nenhum dos dois', async () => {
      useAppBlockConfig.mockReturnValue(CONFIG_BLOQUEIO_PADRAO);
      useAppBlockBannerDismissido.mockReturnValue({
        dispensadoHoje: true,
        carregando: false,
        dispensarHoje: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(screen.queryByTestId('app-block-banner')).toBeNull();
      expect(screen.queryByTestId('app-block-status-card')).toBeNull();
    });

    it('"Configurar agora" chama aoAbrirBloqueioApps', async () => {
      const aoAbrirBloqueioApps = jest.fn();
      useAppBlockConfig.mockReturnValue(CONFIG_BLOQUEIO_PADRAO);
      useAppBlockBannerDismissido.mockReturnValue({
        dispensadoHoje: false,
        carregando: false,
        dispensarHoje: jest.fn(),
      });

      await render(
        <HomeScreen
          {...PROPS_PADRAO}
          aoAbrirBloqueioApps={aoAbrirBloqueioApps}
        />,
      );

      await fireEvent.press(screen.getByText('Configurar agora'));

      expect(aoAbrirBloqueioApps).toHaveBeenCalledTimes(1);
    });

    it('dispensar o banner chama dispensarHoje', async () => {
      const dispensarHoje = jest.fn();
      useAppBlockConfig.mockReturnValue(CONFIG_BLOQUEIO_PADRAO);
      useAppBlockBannerDismissido.mockReturnValue({
        dispensadoHoje: false,
        carregando: false,
        dispensarHoje,
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      await fireEvent.press(screen.getByLabelText('Dispensar'));

      expect(dispensarHoje).toHaveBeenCalledTimes(1);
    });
  });
});
