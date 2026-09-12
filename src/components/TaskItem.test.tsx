import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TaskItem } from './TaskItem';
import { Tarefa } from '../domain/types';

// TaskItem monta TaskActionsSheet no long-press, que agora lê
// useSafeAreaInsets pra dar espaço ao "Cancelar" acima da barra de
// gestos do Android (ver TaskActionsSheet.tsx) — precisa do Provider.
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
    expect(screen.getByLabelText('essencial')).toBeTruthy();
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

  it('a linha não tem botões de texto — as ações vivem no long-press', async () => {
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onEditar={jest.fn()}
        onRemover={jest.fn()}
      />,
    );
    expect(screen.queryByText('editar')).toBeNull();
    expect(screen.queryByText('remover')).toBeNull();
    // o menu só aparece depois do long-press
    expect(screen.queryByText('Excluir')).toBeNull();
  });

  it('long-press abre o menu de ações com o título da tarefa', async () => {
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onEditar={jest.fn()}
        onRemover={jest.fn()}
      />,
    );

    await fireEvent(screen.getByRole('checkbox'), 'longPress');

    expect(screen.getByText('Editar')).toBeTruthy();
    expect(screen.getByText('Excluir')).toBeTruthy();
    expect(screen.getAllByText('Guardar o celular durante o almoço').length).toBeGreaterThan(
      0,
    );
  });

  it('long-press → "Excluir" chama onRemover com o id', async () => {
    const onRemover = jest.fn();
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onRemover={onRemover}
      />,
    );

    await fireEvent(screen.getByRole('checkbox'), 'longPress');
    await fireEvent.press(screen.getByText('Excluir'));

    expect(onRemover).toHaveBeenCalledWith('1');
  });

  it('long-press → "Cancelar" fecha o menu sem chamar nada', async () => {
    const onRemover = jest.fn();
    const onEditar = jest.fn();
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onEditar={onEditar}
        onRemover={onRemover}
      />,
    );

    await fireEvent(screen.getByRole('checkbox'), 'longPress');
    await fireEvent.press(screen.getByText('Cancelar'));

    expect(screen.queryByText('Excluir')).toBeNull();
    expect(onRemover).not.toHaveBeenCalled();
    expect(onEditar).not.toHaveBeenCalled();
  });

  it('sem onEditar/onRemover, o long-press não abre menu nenhum', async () => {
    await render(<TaskItem tarefa={tarefaBase} onAlternar={jest.fn()} />);

    await fireEvent(screen.getByRole('checkbox'), 'longPress');

    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Excluir')).toBeNull();
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

  it('essencial e exercício ao mesmo tempo: os dois selos aparecem juntos, do lado direito', async () => {
    await render(
      <TaskItem
        tarefa={{
          ...tarefaBase,
          essencial: true,
          tipo: 'exercicio',
          duracaoMinutos: 20,
        }}
        onAlternar={jest.fn()}
      />,
    );

    expect(screen.getByTestId('task-item-exercicio-icone')).toBeTruthy();
    expect(screen.getByLabelText('essencial')).toBeTruthy();
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

  it('long-press → "Editar" abre a edição inline e onEditar é chamado ao salvar', async () => {
    const onEditar = jest.fn();
    await render(
      <TaskItem
        tarefa={tarefaBase}
        onAlternar={jest.fn()}
        onEditar={onEditar}
      />,
    );

    await fireEvent(screen.getByRole('checkbox'), 'longPress');
    await fireEvent.press(screen.getByText('Editar'));

    await fireEvent.changeText(
      screen.getByLabelText('Editar tarefa'),
      'Guardar o celular a tarde toda',
    );
    await fireEvent.press(screen.getByText('salvar'));

    expect(onEditar).toHaveBeenCalledWith('1', 'Guardar o celular a tarde toda');
    expect(screen.queryByLabelText('Editar tarefa')).toBeNull();
  });
});
