import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TaskItem } from './TaskItem';
import { Tarefa } from '../domain/types';

const tarefaBase: Tarefa = {
  id: '1',
  titulo: 'Guardar o celular durante o almoço',
  essencial: false,
  concluida: false,
};

describe('TaskItem', () => {
  it('mostra o título da tarefa', async () => {
    await render(<TaskItem tarefa={tarefaBase} onAlternar={jest.fn()} />);
    expect(
      screen.getByText('Guardar o celular durante o almoço'),
    ).toBeTruthy();
  });

  it('mostra o selo de essencial quando a tarefa é essencial', async () => {
    await render(
      <TaskItem
        tarefa={{ ...tarefaBase, essencial: true }}
        onAlternar={jest.fn()}
      />,
    );
    expect(screen.getByText('essencial')).toBeTruthy();
  });

  it('chama onAlternar com o id da tarefa ao ser pressionada', async () => {
    const onAlternar = jest.fn();
    await render(<TaskItem tarefa={tarefaBase} onAlternar={onAlternar} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onAlternar).toHaveBeenCalledWith('1');
  });

  it('reflete o estado concluído na acessibilidade do checkbox', async () => {
    await render(
      <TaskItem
        tarefa={{ ...tarefaBase, concluida: true }}
        onAlternar={jest.fn()}
      />,
    );
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(
      true,
    );
  });
});
