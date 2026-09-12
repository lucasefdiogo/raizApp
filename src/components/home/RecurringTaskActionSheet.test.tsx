import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RecurringTaskActionSheet } from './RecurringTaskActionSheet';

const props = {
  visible: true,
  onRemoverHoje: jest.fn(),
  onPararDeRepetir: jest.fn(),
  onCancelar: jest.fn(),
};

describe('RecurringTaskActionSheet', () => {
  it('mostra as 3 opções quando visível', async () => {
    await render(<RecurringTaskActionSheet {...props} />);

    expect(screen.getByText('Remover só hoje')).toBeTruthy();
    expect(screen.getByText('Parar de repetir')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('não renderiza o conteúdo quando visible é false', async () => {
    await render(<RecurringTaskActionSheet {...props} visible={false} />);

    expect(screen.queryByText('Remover só hoje')).toBeNull();
  });

  it('"Remover só hoje" chama onRemoverHoje e nada mais', async () => {
    const onRemoverHoje = jest.fn();
    const onPararDeRepetir = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <RecurringTaskActionSheet
        {...props}
        onRemoverHoje={onRemoverHoje}
        onPararDeRepetir={onPararDeRepetir}
        onCancelar={onCancelar}
      />,
    );

    await fireEvent.press(screen.getByText('Remover só hoje'));

    expect(onRemoverHoje).toHaveBeenCalledTimes(1);
    expect(onPararDeRepetir).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('"Parar de repetir" chama onPararDeRepetir e nada mais', async () => {
    const onRemoverHoje = jest.fn();
    const onPararDeRepetir = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <RecurringTaskActionSheet
        {...props}
        onRemoverHoje={onRemoverHoje}
        onPararDeRepetir={onPararDeRepetir}
        onCancelar={onCancelar}
      />,
    );

    await fireEvent.press(screen.getByText('Parar de repetir'));

    expect(onPararDeRepetir).toHaveBeenCalledTimes(1);
    expect(onRemoverHoje).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('"Cancelar" chama onCancelar e nada mais', async () => {
    const onRemoverHoje = jest.fn();
    const onPararDeRepetir = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <RecurringTaskActionSheet
        {...props}
        onRemoverHoje={onRemoverHoje}
        onPararDeRepetir={onPararDeRepetir}
        onCancelar={onCancelar}
      />,
    );

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onRemoverHoje).not.toHaveBeenCalled();
    expect(onPararDeRepetir).not.toHaveBeenCalled();
  });
});
