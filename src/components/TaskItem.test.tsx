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

  it('não mostra os botões editar/remover quando os handlers não são passados', async () => {
    await render(<TaskItem tarefa={tarefaBase} onAlternar={jest.fn()} />);
    expect(screen.queryByText('editar')).toBeNull();
    expect(screen.queryByText('remover')).toBeNull();
  });

  it('chama onRemover com o id da tarefa ao tocar em remover', async () => {
    const onRemover = jest.fn();
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onRemover={onRemover}
      />,
    );

    await fireEvent.press(screen.getByText('remover'));
    expect(onRemover).toHaveBeenCalledWith('1');
  });

  it('tarefa de exercício: mostra o ícone e a duração', async () => {
    await render(
      <TaskItem
        tarefa={{ ...tarefaBase, tipo: 'exercicio', duracaoMinutos: 20 }}
        onAlternar={jest.fn()}
      />,
    );

    expect(screen.getByTestId('task-item-exercicio-icone')).toBeTruthy();
    expect(screen.getByText('20 min')).toBeTruthy();
  });

  it('exercício sem duração: mostra o ícone, mas nenhum texto de minutos', async () => {
    await render(
      <TaskItem
        tarefa={{ ...tarefaBase, tipo: 'exercicio' }}
        onAlternar={jest.fn()}
      />,
    );

    expect(screen.getByTestId('task-item-exercicio-icone')).toBeTruthy();
    expect(screen.queryByText(/min/)).toBeNull();
  });

  it('tarefa comum: sem ícone de exercício e sem duração', async () => {
    await render(
      <TaskItem
        tarefa={{ ...tarefaBase, tipo: 'padrao' }}
        onAlternar={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('task-item-exercicio-icone')).toBeNull();
    expect(screen.queryByText(/min/)).toBeNull();
  });

  it('dado legado sem o campo tipo: renderiza como tarefa comum, sem quebrar', async () => {
    // tarefaBase não tem `tipo` nem `duracaoMinutos` — simula tarefa gravada
    // antes da Fase 2.
    await render(<TaskItem tarefa={tarefaBase} onAlternar={jest.fn()} />);

    expect(
      screen.getByText('Guardar o celular durante o almoço'),
    ).toBeTruthy();
    expect(screen.queryByTestId('task-item-exercicio-icone')).toBeNull();
  });

  it('edita o título inline e chama onEditar com id e novo texto ao salvar', async () => {
    const onEditar = jest.fn();
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onEditar={onEditar}
      />,
    );

    await fireEvent.press(screen.getByText('editar'));
    await fireEvent.changeText(
      screen.getByLabelText('Editar tarefa'),
      'Guardar o celular a tarde toda',
    );
    await fireEvent.press(screen.getByText('salvar'));

    expect(onEditar).toHaveBeenCalledWith('1', 'Guardar o celular a tarde toda');
    expect(screen.queryByLabelText('Editar tarefa')).toBeNull();
  });
});
