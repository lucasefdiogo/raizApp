import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AddTaskForm } from './AddTaskForm';
import { MENSAGEM_LIMITE_ESSENCIAIS } from '../../domain/dailyTasks';

const marcadorEssencial = () =>
  screen.getByRole('checkbox', { name: 'Marcar como essencial' });
const marcadorExercicio = () =>
  screen.getByRole('checkbox', { name: 'Isso é exercício?' });

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

    expect(onAdicionar).toHaveBeenCalledWith(
      'revisar o capítulo 3',
      false,
      'padrao',
      undefined,
    );
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
    await fireEvent.press(marcadorEssencial());
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'estudar 25 min',
      true,
      'padrao',
      undefined,
    );
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
    expect(marcadorEssencial().props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(marcadorEssencial());
    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      'organizar a mesa',
    );
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'organizar a mesa',
      false,
      'padrao',
      undefined,
    );
  });

  it('o campo de duração só aparece depois de marcar "Isso é exercício?"', async () => {
    await render(
      <AddTaskForm onAdicionar={jest.fn()} limiteEssenciaisAtingido={false} />,
    );

    expect(screen.queryByLabelText('Duração (min)')).toBeNull();

    await fireEvent.press(marcadorExercicio());

    expect(screen.getByLabelText('Duração (min)')).toBeTruthy();
  });

  it('adiciona um exercício com tipo e duração, e volta ao padrão depois', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido={false} />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nova tarefa'),
      'Caminhada leve',
    );
    await fireEvent.press(marcadorExercicio());
    await fireEvent.changeText(screen.getByLabelText('Duração (min)'), '20');
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'Caminhada leve',
      false,
      'exercicio',
      20,
    );
    // formulário reseta: sem campo de duração, campo de título limpo
    expect(screen.queryByLabelText('Duração (min)')).toBeNull();
    expect(screen.getByLabelText('Nova tarefa').props.value).toBe('');
  });

  it('exercício sem duração preenchida: manda tipo "exercicio" e duração undefined', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido={false} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Nova tarefa'), 'Alongar');
    await fireEvent.press(marcadorExercicio());
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'Alongar',
      false,
      'exercicio',
      undefined,
    );
  });

  it('desmarcar "Isso é exercício?" limpa a duração digitada', async () => {
    const onAdicionar = jest.fn();
    await render(
      <AddTaskForm onAdicionar={onAdicionar} limiteEssenciaisAtingido={false} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Nova tarefa'), 'Corrida');
    await fireEvent.press(marcadorExercicio());
    await fireEvent.changeText(screen.getByLabelText('Duração (min)'), '30');
    await fireEvent.press(marcadorExercicio()); // desmarca
    await fireEvent.press(marcadorExercicio()); // marca de novo
    await fireEvent.press(screen.getByText('Adicionar tarefa'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'Corrida',
      false,
      'exercicio',
      undefined,
    );
  });
});
