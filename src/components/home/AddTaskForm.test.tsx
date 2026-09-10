import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AddTaskForm } from './AddTaskForm';
import { MENSAGEM_LIMITE_ESSENCIAIS } from '../../domain/dailyTasks';

describe('AddTaskForm', () => {
  it('adiciona uma tarefa comum com o título digitado e limpa o campo', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido={false} />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      '  revisar o capítulo 3  ',
    );
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith('revisar o capítulo 3', false);
    expect(screen.getByLabelText('Nova tarefa').props.value).toBe('');
  });

  it('adiciona como essencial quando o marcador está ligado', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido={false} />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      'estudar 25 min',
    );
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith('estudar 25 min', true);
  });

  it('não adiciona nada com o campo vazio', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido={false} />,
    );

    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).not.toHaveBeenCalled();
  });

  it('no teto de essenciais: desabilita o marcador, avisa e ainda adiciona como comum', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido />,
    );

    expect(screen.getByText(MENSAGEM_LIMITE_ESSENCIAIS)).toBeTruthy();
    expect(
      screen.getByRole('checkbox').props.accessibilityState.disabled,
    ).toBe(true);

    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      'organizar a mesa',
    );
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith('organizar a mesa', false);
  });
});
