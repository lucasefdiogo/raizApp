import React from 'react';
import { TextInput } from 'react-native';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

jest.mock('../utils/taskFeedbackMessages');
const {
  obterMensagemTarefaConcluida,
} = require('../utils/taskFeedbackMessages');

jest.mock('../services/firestore');
const { buscarSystemMessage } = require('../services/firestore');

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
};

beforeEach(() => {
  obterMensagemTarefaConcluida.mockClear();
  obterMensagemTarefaConcluida.mockReturnValue('Feito. Isso conta.');
  buscarSystemMessage.mockReset();
  buscarSystemMessage.mockResolvedValue({
    titulo: 'Sete dias seguidos',
    corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
  });
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

  it('adiciona uma tarefa nova pela Home e ela aparece na lista', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);

    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      'Revisar o resumo da aula',
    );
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(screen.getByText('Revisar o resumo da aula')).toBeTruthy();
  });

  it('remove uma tarefa pela Home e ela some da lista', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(
      screen.getByText('Guardar o celular durante o almoço'),
    ).toBeTruthy();

    // "remover" da 2ª tarefa da lista mock
    await fireEvent.press(screen.getAllByText('remover')[1]);

    expect(screen.queryByText('Guardar o celular durante o almoço')).toBeNull();
    expect(
      screen.getByText('Abrir o material de estudo por 5 minutos'),
    ).toBeTruthy();
  });

  it('quando todas as tarefas são removidas, mostra o EmptyState (não a lista em branco)', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(screen.queryByTestId('empty-state')).toBeNull();

    for (const titulo of [
      'Abrir o material de estudo por 5 minutos',
      'Guardar o celular durante o almoço',
      'Escrever uma frase sobre o que pretende fazer hoje',
    ]) {
      await fireEvent.press(screen.getAllByText('remover')[0]);
      expect(screen.queryByText(titulo)).toBeNull();
    }

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('Nenhuma tarefa ainda')).toBeTruthy();
  });

  it('o CTA do EmptyState foca o campo "Nova tarefa" (mesmo fluxo de adicionar, sem caminho paralelo)', async () => {
    useDailyTasks.mockReturnValueOnce({
      tarefas: [],
      alternarTarefa: jest.fn(),
      adicionarTarefa: jest.fn(),
      editarTarefa: jest.fn(),
      removerTarefa: jest.fn(),
      statusDia: 'pendente',
      carregando: false,
      limiteEssenciaisAtingido: false,
      recarregar: jest.fn().mockResolvedValue(undefined),
    });

    const focar = jest
      .spyOn(TextInput.prototype, 'focus')
      .mockImplementation(() => {});

    await render(<HomeScreen {...PROPS_PADRAO} />);

    // não existe um segundo campo/fluxo — o CTA reaproveita o AddTaskForm
    expect(screen.queryByText('Adicionar tarefa')).toBeTruthy();

    await fireEvent.press(screen.getByText('+ adicionar tarefa'));

    expect(focar).toHaveBeenCalledTimes(1);
    focar.mockRestore();
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
});
