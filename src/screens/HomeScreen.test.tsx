import React, { createRef } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './HomeScreen';
import { TOUR_PASSOS } from '../components/tour/tourSteps';

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

jest.mock('../hooks/useNomeUsuario');
const { useNomeUsuario } = require('../hooks/useNomeUsuario');

// HU-07, RN07: só interessa aqui que o valor chega ao primeiro chip do
// AddTaskForm — o hook em si tem teste próprio (useAlternativaNoturna.test.ts).
jest.mock('../hooks/useAlternativaNoturna');
const { useAlternativaNoturna } = require('../hooks/useAlternativaNoturna');

// Só interessa aqui que a Home chama o hook (ver racional no próprio
// HomeScreen.tsx) — o comportamento dele tem teste próprio
// (useSincronizarRegrasBloqueio.test.ts).
jest.mock('../hooks/useSincronizarRegrasBloqueio');

// Coleta de uso das redes (HU-02): tem teste próprio; aqui só a chamada.
jest.mock('../hooks/useColetaUsoApps');
const { useColetaUsoApps } = require('../hooks/useColetaUsoApps');

// Sincronização do serviço de acessibilidade (HU-03): tem teste próprio.
jest.mock('../hooks/useSincronizarAcessibilidade');
const { useSincronizarAcessibilidade } = require('../hooks/useSincronizarAcessibilidade');

// Abertura do destino da notificação (HU-03): tem teste próprio.
jest.mock('../hooks/useAbrirDestinoDaNotificacao');
const {
  useAbrirDestinoDaNotificacao,
} = require('../hooks/useAbrirDestinoDaNotificacao');

// useFeatureTour usa useNavigation/useFocusEffect (precisaria de um
// NavigationContainer, que este arquivo não monta) — mockado e inativo por
// padrão; o comportamento do hook em si tem teste próprio
// (useFeatureTour.test.ts). Aqui só interessa o que a HomeScreen faz com
// tourAtivo/passoAtual.
jest.mock('../hooks/useFeatureTour');
const { useFeatureTour } = require('../hooks/useFeatureTour');

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
      const criarSubtarefa = jest.fn().mockReturnValue('subtarefa-mock');
      const moverTarefaParaAmanha = jest.fn().mockResolvedValue(undefined);

      return {
        tarefas,
        alternarTarefa,
        adicionarTarefa,
        editarTarefa,
        removerTarefa,
        removerTarefaHoje: jest.fn(),
        pararDeRepetir: jest.fn(),
        criarSubtarefa,
        moverTarefaParaAmanha,
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
  marcoAtingido: null,
  avaliarAlertaRisco: jest.fn(),
  recarregarStreak: jest.fn().mockResolvedValue(undefined),
  progressoTabRef: createRef<React.ComponentRef<typeof View>>(),
  perfilTabRef: createRef<React.ComponentRef<typeof View>>(),
  aoAtualizarTour: jest.fn(),
};

beforeEach(() => {
  PROPS_PADRAO.aoAtualizarTour.mockClear();
  obterMensagemTarefaConcluida.mockClear();
  obterMensagemTarefaConcluida.mockReturnValue('Feito. Isso conta.');
  buscarSystemMessage.mockReset();
  buscarSystemMessage.mockResolvedValue({
    titulo: 'Sete dias seguidos',
    corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
  });
  useNomeUsuario.mockReturnValue('Ana');
  useAlternativaNoturna.mockReturnValue(null);
  useFeatureTour.mockReturnValue({
    tourAtivo: false,
    passoAtual: 0,
    avancar: jest.fn(),
    pular: jest.fn(),
    reiniciar: jest.fn(),
  });
});

describe('HomeScreen', () => {
  it('CA-01: a Home dispara a coleta de uso das redes com o uid do usuário', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(useColetaUsoApps).toHaveBeenCalledWith('uid-teste');
  });

  it('CA-05: a Home dispara a sincronização de acessibilidade com o uid do usuário', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(useSincronizarAcessibilidade).toHaveBeenCalledWith('uid-teste');
  });

  it('CA-04: a Home dispara a abertura do destino da notificação', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(useAbrirDestinoDaNotificacao).toHaveBeenCalled();
  });

  describe('HU-07 · headline e placar (RN01/RN03/RN04)', () => {
    it('Cenário 1: com 1 essencial pendente, mostra o headline e o placar de essenciais', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);
      expect(
        screen.getByText('O que você vai fazer no lugar da rolagem hoje?'),
      ).toBeTruthy();
      expect(screen.getByText('ESSENCIAIS · 0 DE 1 FEITAS')).toBeTruthy();
    });

    it('Cenário 3 e 4: concluir a essencial troca o headline, desmarcar volta ao anterior', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);
      const essencial = screen.getByText(
        'Abrir o material de estudo por 5 minutos',
      );

      await fireEvent.press(essencial);
      expect(screen.getByText('Hoje já conta. O resto é bônus.')).toBeTruthy();
      expect(
        screen.getByText('Se a vontade de abrir o feed aparecer, escolha uma daqui.'),
      ).toBeTruthy();
      expect(screen.queryByText('ESSENCIAIS · 1 DE 1 FEITAS')).toBeNull();

      await fireEvent.press(essencial);
      expect(
        screen.getByText('O que você vai fazer no lugar da rolagem hoje?'),
      ).toBeTruthy();
      expect(screen.getByText('ESSENCIAIS · 0 DE 1 FEITAS')).toBeTruthy();
    });

    it('Cenário 2: sem nenhuma essencial no dia, pede pra marcar', async () => {
      useDailyTasks.mockReturnValueOnce({
        tarefas: [
          { id: '1', titulo: 'Tarefa comum 1', essencial: false, concluida: false },
          { id: '2', titulo: 'Tarefa comum 2', essencial: false, concluida: false },
        ],
        alternarTarefa: jest.fn(),
        adicionarTarefa: jest.fn(),
        editarTarefa: jest.fn(),
        removerTarefa: jest.fn(),
        removerTarefaHoje: jest.fn(),
        pararDeRepetir: jest.fn(),
        criarSubtarefa: jest.fn(),
        moverTarefaParaAmanha: jest.fn(),
        statusDia: 'pendente',
        carregando: false,
        limiteEssenciaisAtingido: false,
        recarregar: jest.fn().mockResolvedValue(undefined),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(screen.getByText('MARQUE ATÉ 3 COMO ESSENCIAIS')).toBeTruthy();
    });
  });

  it('StreakCard: rodapé pede a essencial antes de cumprir, garante o dia ao concluir', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(
      screen.getByText('Conclua 1 essencial para garantir hoje'),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    );

    expect(screen.getByText('Hoje já está garantido')).toBeTruthy();
    // O número do streak em si não muda — só a mensagem do rodapé troca.
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('mostra o streak recebido via prop', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(screen.getByText('4')).toBeTruthy();
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

    await fireEvent.press(screen.getByText('Adicionar alternativa'));
    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      'Revisar o resumo da aula',
    );
    await fireEvent.press(screen.getByText('Adicionar'));

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

  it('Cenário 9: quando todas as tarefas são removidas, mostra o EmptyState com a única ação', async () => {
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
    expect(screen.getByText('Nada planejado ainda')).toBeTruthy();
    // única ação: nem o headline/placar, nem "Estou travado" aparecem aqui.
    expect(
      screen.queryByText('O que você vai fazer no lugar da rolagem hoje?'),
    ).toBeNull();
    expect(screen.queryByTestId('botao-estou-travado')).toBeNull();

    await fireEvent.press(screen.getByText('Adicionar alternativa'));
    expect(screen.getByLabelText('Nova alternativa')).toBeTruthy();
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

    // TAREFAS_MOCK já tem 1 essencial; adiciona mais 2 (teto = 3)
    for (const titulo of ['Essencial dois', 'Essencial três']) {
      await fireEvent.press(screen.getByText('Adicionar alternativa'));
      await fireEvent.changeText(screen.getByLabelText('Nova alternativa'), titulo);
      await fireEvent.press(screen.getByRole('switch', { name: 'Essencial' }));
      await fireEvent.press(screen.getByText('Adicionar'));
    }

    expect(screen.getByText('Essencial dois')).toBeTruthy();
    expect(screen.getByText('Essencial três')).toBeTruthy();

    await fireEvent.press(screen.getByText('Adicionar alternativa'));
    expect(screen.getByText('Você já tem 3 essenciais hoje.')).toBeTruthy();
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

  describe('regressão: animação de regar a raiz só pra tarefa essencial', () => {
    it('tarefa essencial: mostra RootWateringOverlay, não o TaskCompletedOverlay simples', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);
      await fireEvent.press(
        screen.getByText('Abrir o material de estudo por 5 minutos'),
      );

      expect(screen.getByTestId('root-watering-overlay')).toBeTruthy();
      expect(screen.getByText('A raiz recebeu hoje.')).toBeTruthy();
      // "✓" isolado é exclusivo do TaskCompletedOverlay simples — não deve
      // aparecer nesse caminho (a linha de desbloqueio, quando presente,
      // vem junto de texto, nunca um "✓" sozinho).
      expect(screen.queryByText('✓')).toBeNull();
    });

    it('tarefa comum: mostra o TaskCompletedOverlay simples, não a animação de regar', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);
      await fireEvent.press(
        screen.getByText('Guardar o celular durante o almoço'),
      );

      expect(screen.getByText('Feito. Isso conta.')).toBeTruthy();
      expect(screen.queryByTestId('root-watering-overlay')).toBeNull();
      expect(screen.queryByText('A raiz recebeu hoje.')).toBeNull();
    });

    it('tarefa essencial: diasSequencia da animação é streakAtual + 1 (conta hoje sem esperar o boot de amanhã)', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} streakAtual={4} />);
      await fireEvent.press(
        screen.getByText('Abrir o material de estudo por 5 minutos'),
      );

      // streakAtual (4) + 1 = 5 -> próximo marco 7, faltam 2.
      expect(screen.getByText('5 dias')).toBeTruthy();
      expect(screen.getByText('próximo ramo em 2')).toBeTruthy();
    });
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
    // o header (saudação + StreakCard) já aparece — variante inline
    expect(screen.getByText('4')).toBeTruthy();
    expect(
      screen.queryByText('Abrir o material de estudo por 5 minutos'),
    ).toBeNull();
    expect(screen.queryByText('Adicionar alternativa')).toBeNull();
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

  describe('tour de funcionalidades', () => {
    // A HomeScreen não renderiza o FeatureTourOverlay ela mesma — só quem
    // vive dentro dela (StreakCard, AddTaskForm) consegue medir seus
    // próprios elementos; quem desenha é o MainTabNavigator, que
    // cobre a tab bar também (ver comentário em FeatureTourOverlay.tsx —
    // um overlay montado dentro da Home nunca conseguiria desenhar por
    // cima da tab bar, ela é uma árvore irmã). Por isso os testes aqui
    // checam o que é repassado via aoAtualizarTour, não o que é renderizado.
    function ultimaChamada() {
      const chamadas = PROPS_PADRAO.aoAtualizarTour.mock.calls;
      return chamadas[chamadas.length - 1][0];
    }

    it('tourAtivo false (flag já vista): chama aoAtualizarTour(null)', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);

      expect(ultimaChamada()).toBeNull();
    });

    it('tourAtivo true: chama aoAtualizarTour com o passo/texto atuais', async () => {
      useFeatureTour.mockReturnValue({
        tourAtivo: true,
        passoAtual: 0,
        avancar: jest.fn(),
        pular: jest.fn(),
        reiniciar: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      const chamada = ultimaChamada();
      expect(chamada).not.toBeNull();
      expect(chamada.passoAtual).toBe(0);
      expect(chamada.totalPassos).toBe(4);
      expect(chamada.texto).toBe(TOUR_PASSOS[0].texto);
    });

    it('Cenário 10: no passo 2, o alvo é o botão "Adicionar alternativa" e o texto usa esse nome', async () => {
      useFeatureTour.mockReturnValue({
        tourAtivo: true,
        passoAtual: 1,
        avancar: jest.fn(),
        pular: jest.fn(),
        reiniciar: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);

      const chamada = ultimaChamada();
      expect(chamada.texto).toBe(TOUR_PASSOS[1].texto);
      expect(chamada.texto).toContain('Adicionar alternativa');
      expect(screen.getByText('Adicionar alternativa')).toBeTruthy();
    });

    it('onPular repassado chama pular() do useFeatureTour', async () => {
      const pular = jest.fn();
      useFeatureTour.mockReturnValue({
        tourAtivo: true,
        passoAtual: 0,
        avancar: jest.fn(),
        pular,
        reiniciar: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);
      ultimaChamada().onPular();

      expect(pular).toHaveBeenCalledTimes(1);
    });

    it('onAvancar repassado chama avancar() do useFeatureTour', async () => {
      const avancar = jest.fn();
      useFeatureTour.mockReturnValue({
        tourAtivo: true,
        passoAtual: 1,
        avancar,
        pular: jest.fn(),
        reiniciar: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} />);
      ultimaChamada().onAvancar();

      expect(avancar).toHaveBeenCalledTimes(1);
    });

    it('regressão: com o tour ativo, o modal de marco continua podendo aparecer — nenhum dos dois suprime o outro', async () => {
      useFeatureTour.mockReturnValue({
        tourAtivo: true,
        passoAtual: 0,
        avancar: jest.fn(),
        pular: jest.fn(),
        reiniciar: jest.fn(),
      });

      await render(<HomeScreen {...PROPS_PADRAO} marcoAtingido={7} />);

      await waitFor(() => expect(screen.getByText('Marco atingido')).toBeTruthy());
      expect(ultimaChamada()).not.toBeNull();
    });
  });

  describe('TravadoFlow ("Estou travado")', () => {
    it('botão discreto abaixo da lista abre o TravadoFlow com a 1ª essencial pendente como contexto', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);

      await fireEvent.press(screen.getByTestId('botao-estou-travado'));

      expect(screen.getByText('O que está pegando agora?')).toBeTruthy();
    });

    it('toque longo numa tarefa abre o TravadoFlow com aquela tarefa (via TaskActionsSheet)', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);

      await fireEvent(
        screen.getByText('Guardar o celular durante o almoço'),
        'longPress',
      );
      // 2 ocorrências na tela: o item do menu de long-press e o botão
      // discreto abaixo da lista — o do menu vem primeiro na árvore.
      await fireEvent.press(screen.getAllByText('Estou travado')[0]);

      expect(screen.getByText('O que está pegando agora?')).toBeTruthy();
    });

    it('"Fechar" no TravadoFlow volta pra Home normalmente', async () => {
      await render(<HomeScreen {...PROPS_PADRAO} />);

      await fireEvent.press(screen.getByTestId('botao-estou-travado'));
      expect(screen.getByText('O que está pegando agora?')).toBeTruthy();

      await fireEvent.press(screen.getByText('Fechar'));

      expect(screen.queryByText('O que está pegando agora?')).toBeNull();
      expect(
        screen.getByText('O que você vai fazer no lugar da rolagem hoje?'),
      ).toBeTruthy();
    });
  });
});
