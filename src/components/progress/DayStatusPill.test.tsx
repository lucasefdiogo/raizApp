import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DayStatusPill } from './DayStatusPill';
import { theme } from '../../theme';

function estiloIndicador() {
  return StyleSheet.flatten(
    screen.getByTestId('day-status-pill-indicador').props.style,
  );
}

describe('DayStatusPill', () => {
  it('cumprido: Musgo sólido', async () => {
    await render(<DayStatusPill status="cumprido" label="seg" />);
    expect(estiloIndicador()).toMatchObject({
      backgroundColor: theme.colors.musgo,
      opacity: 1,
    });
    expect(screen.getByText('seg')).toBeTruthy();
  });

  it('protegido_escudo: Musgo translúcido', async () => {
    await render(<DayStatusPill status="protegido_escudo" label="ter" />);
    expect(estiloIndicador()).toMatchObject({
      backgroundColor: theme.colors.musgo,
      opacity: 0.5,
    });
  });

  it('perdido: tom neutro, sem opacidade reduzida', async () => {
    await render(<DayStatusPill status="perdido" label="qua" />);
    expect(estiloIndicador()).toMatchObject({
      backgroundColor: theme.colors.border,
      opacity: 1,
    });
  });

  it('pendente: Cobre', async () => {
    await render(<DayStatusPill status="pendente" label="qui" />);
    expect(estiloIndicador()).toMatchObject({
      backgroundColor: theme.colors.cobre,
      opacity: 1,
    });
  });

  it('sem_registro: mesmo tom neutro de perdido, mas quase invisível', async () => {
    await render(<DayStatusPill status="sem_registro" label="sex" />);
    expect(estiloIndicador()).toMatchObject({
      backgroundColor: theme.colors.border,
      opacity: 0.35,
    });
  });
});
