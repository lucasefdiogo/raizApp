import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SeletorDiasSemana } from './SeletorDiasSemana';
import { theme } from '../../theme';

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

  it('HU-09 RN03/RN19: dia selecionado usa Terra Escura, nunca Cobre', async () => {
    await render(<SeletorDiasSemana diasSelecionados={[1]} onToggleDia={jest.fn()} />);

    const estilo = StyleSheet.flatten(screen.getByLabelText('segunda').props.style);
    expect(estilo.backgroundColor).toBe(theme.colors.terraEscura);
    expect(estilo.backgroundColor).not.toBe(theme.colors.cobre);
  });

  it('HU-09 RN03: dia não selecionado usa borda Terra Suave', async () => {
    await render(<SeletorDiasSemana diasSelecionados={[]} onToggleDia={jest.fn()} />);

    const estilo = StyleSheet.flatten(screen.getByLabelText('terça').props.style);
    expect(estilo.borderColor).toBe(theme.colors.terraSuave);
  });
});
