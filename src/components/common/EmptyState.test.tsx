import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza titulo e corpo recebidos por prop, com o ícone da marca', async () => {
    await render(
      <EmptyState
        titulo="Nenhuma tarefa ainda"
        corpo="Adicione a primeira — pode ser bem pequena."
      />,
    );

    expect(screen.getByText('Nenhuma tarefa ainda')).toBeTruthy();
    expect(
      screen.getByText('Adicione a primeira — pode ser bem pequena.'),
    ).toBeTruthy();
    expect(screen.getByTestId('root-progress-icon')).toBeTruthy();
  });

  it('não mostra CTA quando ctaLabel e onCtaPress são omitidos', async () => {
    await render(
      <EmptyState titulo="Sem histórico" corpo="Volte depois do primeiro dia." />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('não mostra CTA quando só ctaLabel é passado (sem onCtaPress)', async () => {
    await render(
      <EmptyState
        titulo="Sem histórico"
        corpo="Volte depois do primeiro dia."
        ctaLabel="+ adicionar tarefa"
      />,
    );

    expect(screen.queryByText('+ adicionar tarefa')).toBeNull();
  });

  it('não mostra CTA quando só onCtaPress é passado (sem ctaLabel)', async () => {
    await render(
      <EmptyState
        titulo="Sem histórico"
        corpo="Volte depois do primeiro dia."
        onCtaPress={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('mostra o CTA e chama onCtaPress ao tocar quando ambos são passados', async () => {
    const onCtaPress = jest.fn();
    await render(
      <EmptyState
        titulo="Nenhuma tarefa ainda"
        corpo="Adicione a primeira."
        ctaLabel="+ adicionar tarefa"
        onCtaPress={onCtaPress}
      />,
    );

    const cta = screen.getByText('+ adicionar tarefa');
    await fireEvent.press(cta);

    expect(onCtaPress).toHaveBeenCalledTimes(1);
  });
});
