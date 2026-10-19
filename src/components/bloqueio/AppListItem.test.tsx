import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppListItem } from './AppListItem';

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
});
