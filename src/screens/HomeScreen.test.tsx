import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

jest.mock('../utils/taskFeedbackMessages');
const {
  obterMensagemTarefaConcluida,
} = require('../utils/taskFeedbackMessages');

jest.mock('../services/firestore');
const { buscarSystemMessage } = require('../services/firestore');

const PROPS_PADRAO = {
  streakAtual: 4,
  escudosDisponiveis: 1,
  marcoAtingido: null,
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

  it('mostra o streak e os escudos recebidos via prop', async () => {
    await render(<HomeScreen {...PROPS_PADRAO} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('1 escudo disponível')).toBeTruthy();
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
});
