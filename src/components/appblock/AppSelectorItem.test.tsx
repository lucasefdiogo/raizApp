import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppSelectorItem } from './AppSelectorItem';

describe('AppSelectorItem', () => {
  it('mostra o nome e o ícone recebidos', async () => {
    await render(
      <AppSelectorItem
        nome="Instagram"
        icone="data:image/png;base64,QQ=="
        selecionado={false}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText('Instagram')).toBeTruthy();
    const linha = screen.getByRole('checkbox');
    expect(linha.props.accessibilityState.checked).toBe(false);
  });

  it('sem ícone: não quebra, mostra o placeholder', async () => {
    await render(
      <AppSelectorItem
        nome="WhatsApp"
        icone={null}
        selecionado={false}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('reflete selecionado=true na acessibilidade', async () => {
    await render(
      <AppSelectorItem
        nome="TikTok"
        icone={null}
        selecionado
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(
      true,
    );
  });

  it('chama onToggle ao tocar na linha', async () => {
    const onToggle = jest.fn();
    await render(
      <AppSelectorItem
        nome="Instagram"
        icone={null}
        selecionado={false}
        onToggle={onToggle}
      />,
    );

    await fireEvent.press(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
