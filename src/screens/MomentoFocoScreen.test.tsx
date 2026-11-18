import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MomentoFocoScreen } from './MomentoFocoScreen';

jest.mock('./intercept/SessaoFocoScreen', () => ({
  SessaoFocoScreen: (props: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return <Text testID="sessao-mock">{String(props.duracaoInicialSeg)}|{String(props.tarefaId)}</Text>;
  },
}));

const tarefa = { id: 'tarefa-1', titulo: 'Abrir o material', essencial: false, concluida: false };

describe('MomentoFocoScreen', () => {
  it('liga a sessão à tarefa e à duração escolhida sem marcar conclusão', async () => {
    const onMarcar = jest.fn();
    await render(
      <MomentoFocoScreen uid="uid-1" tarefa={tarefa} onEstouTravado={jest.fn()}
        onMarcarTarefaComoFeita={onMarcar} onFechar={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('2 min'));
    await fireEvent.press(screen.getByText('Iniciar momento de foco'));
    expect(screen.getByTestId('sessao-mock').props.children.join('')).toBe('120|tarefa-1');
    expect(onMarcar).not.toHaveBeenCalled();
  });

  it('oferece ajuda antes de iniciar', async () => {
    const onEstouTravado = jest.fn();
    await render(
      <MomentoFocoScreen uid="uid-1" tarefa={tarefa} onEstouTravado={onEstouTravado}
        onMarcarTarefaComoFeita={jest.fn()} onFechar={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('Estou travado'));
    expect(onEstouTravado).toHaveBeenCalledTimes(1);
  });

  it('fecha a escolha de duração ao usar o botão voltar do Android antes de iniciar', async () => {
    const onFechar = jest.fn();
    await render(
      <MomentoFocoScreen uid="uid-1" tarefa={tarefa} onEstouTravado={jest.fn()}
        onMarcarTarefaComoFeita={jest.fn()} onFechar={onFechar} />,
    );
    await fireEvent(screen.getByTestId('momento-foco-modal'), 'requestClose');
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
