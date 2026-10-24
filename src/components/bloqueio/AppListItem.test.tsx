import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppListItem } from './AppListItem';
import { theme } from '../../theme';

const APP = { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'abc123' };

describe('AppListItem', () => {
  it('mostra o nome do app', async () => {
    await render(<AppListItem app={APP} selecionado={false} onToggle={jest.fn()} />);

    expect(screen.getByText('Instagram')).toBeTruthy();
  });

  it('accessibilityState.checked reflete `selecionado`', async () => {
    await render(<AppListItem app={APP} selecionado onToggle={jest.fn()} />);

    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('chama onToggle ao tocar na linha', async () => {
    const onToggle = jest.fn();
    await render(<AppListItem app={APP} selecionado={false} onToggle={onToggle} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('com dica: mostra o texto e o expõe como accessibilityHint', async () => {
    await render(<AppListItem app={APP} selecionado={false} onToggle={jest.fn()} dica="Pode deixar livre." />);

    expect(screen.getByText('Pode deixar livre.')).toBeTruthy();
    expect(screen.getByLabelText('Instagram').props.accessibilityHint).toBe('Pode deixar livre.');
  });

  it('sem dica: não mostra texto extra nem accessibilityHint', async () => {
    await render(<AppListItem app={APP} selecionado={false} onToggle={jest.fn()} />);

    expect(screen.getByLabelText('Instagram').props.accessibilityHint).toBeUndefined();
  });

  it('HU-09 RN04/RN19: caixa marcada usa Musgo, nunca Cobre', async () => {
    await render(<AppListItem app={APP} selecionado onToggle={jest.fn()} />);

    const estilo = StyleSheet.flatten(screen.getByTestId('marcador').props.style);
    expect(estilo.borderColor).toBe(theme.colors.musgo);
    expect(estilo.backgroundColor).toBe(theme.colors.musgo);
    expect(estilo.borderColor).not.toBe(theme.colors.cobre);
    expect(screen.getByTestId('marcador-check')).toBeTruthy();
  });

  it('HU-09 RN04: caixa não marcada não mostra o check', async () => {
    await render(<AppListItem app={APP} selecionado={false} onToggle={jest.fn()} />);

    expect(screen.queryByTestId('marcador-check')).toBeNull();
  });

  it('a linha tem fundo e borda de cartão, não um texto solto (conforme o protótipo)', async () => {
    await render(<AppListItem app={APP} selecionado={false} onToggle={jest.fn()} />);

    const estilo = StyleSheet.flatten(screen.getByLabelText('Instagram').props.style);
    expect(estilo.backgroundColor).toBe(theme.colors.areia);
    expect(estilo.borderWidth).toBeGreaterThan(0);
    expect(estilo.borderColor).toBe(theme.colors.border);
    expect(estilo.borderRadius).toBe(theme.radius.md);
  });
});
