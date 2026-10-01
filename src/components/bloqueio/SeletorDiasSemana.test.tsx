import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SeletorDiasSemana } from './SeletorDiasSemana';

describe('SeletorDiasSemana', () => {
  it('mostra os 7 dias', async () => {
    await render(<SeletorDiasSemana diasSelecionados={[]} onToggleDia={jest.fn()} />);

    expect(screen.getByLabelText('domingo')).toBeTruthy();
    expect(screen.getByLabelText('segunda')).toBeTruthy();
    expect(screen.getByLabelText('terça')).toBeTruthy();
    expect(screen.getByLabelText('quarta')).toBeTruthy();
    expect(screen.getByLabelText('quinta')).toBeTruthy();
    expect(screen.getByLabelText('sexta')).toBeTruthy();
    expect(screen.getByLabelText('sábado')).toBeTruthy();
  });

  it('marca como checked os dias selecionados', async () => {
    await render(<SeletorDiasSemana diasSelecionados={[1, 3]} onToggleDia={jest.fn()} />);

    expect(screen.getByLabelText('segunda').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('quarta').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('terça').props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('chama onToggleDia com o valor do dia tocado', async () => {
    const onToggleDia = jest.fn();
    await render(<SeletorDiasSemana diasSelecionados={[]} onToggleDia={onToggleDia} />);

    await fireEvent.press(screen.getByLabelText('sexta'));

    expect(onToggleDia).toHaveBeenCalledWith(5);
  });
});
