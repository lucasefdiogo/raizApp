import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TaskTypeToggle } from './TaskTypeToggle';

const props = {
  tipo: 'padrao' as const,
  duracaoMinutos: null,
  onChangeTipo: jest.fn(),
  onChangeDuracao: jest.fn(),
};

describe('TaskTypeToggle', () => {
  it('não mostra o campo de duração quando tipo é "padrao"', async () => {
    await render(<TaskTypeToggle {...props} />);

    expect(screen.getByText('Isso é exercício?')).toBeTruthy();
    expect(screen.queryByLabelText('Duração (min)')).toBeNull();
  });

  it('mostra o campo de duração quando tipo é "exercicio"', async () => {
    await render(<TaskTypeToggle {...props} tipo="exercicio" />);

    expect(screen.getByLabelText('Duração (min)')).toBeTruthy();
  });

  it('ao marcar o toggle, chama onChangeTipo("exercicio")', async () => {
    const onChangeTipo = jest.fn();
    await render(<TaskTypeToggle {...props} onChangeTipo={onChangeTipo} />);

    await fireEvent.press(screen.getByRole('checkbox'));

    expect(onChangeTipo).toHaveBeenCalledWith('exercicio');
  });

  it('ao desmarcar o toggle, volta pra "padrao" e zera a duração', async () => {
    const onChangeTipo = jest.fn();
    const onChangeDuracao = jest.fn();
    await render(
      <TaskTypeToggle
        {...props}
        tipo="exercicio"
        duracaoMinutos={20}
        onChangeTipo={onChangeTipo}
        onChangeDuracao={onChangeDuracao}
      />,
    );

    await fireEvent.press(screen.getByRole('checkbox'));

    expect(onChangeTipo).toHaveBeenCalledWith('padrao');
    expect(onChangeDuracao).toHaveBeenCalledWith(null);
  });

  it('digitar no campo de duração emite o número; apagar emite null', async () => {
    const onChangeDuracao = jest.fn();
    await render(
      <TaskTypeToggle
        {...props}
        tipo="exercicio"
        onChangeDuracao={onChangeDuracao}
      />,
    );

    const campo = screen.getByLabelText('Duração (min)');
    await fireEvent.changeText(campo, '25');
    expect(onChangeDuracao).toHaveBeenLastCalledWith(25);

    await fireEvent.changeText(campo, '');
    expect(onChangeDuracao).toHaveBeenLastCalledWith(null);
  });

  it('ignora caracteres não numéricos na duração', async () => {
    const onChangeDuracao = jest.fn();
    await render(
      <TaskTypeToggle
        {...props}
        tipo="exercicio"
        onChangeDuracao={onChangeDuracao}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Duração (min)'), '2a0b');

    expect(onChangeDuracao).toHaveBeenLastCalledWith(20);
  });
});
