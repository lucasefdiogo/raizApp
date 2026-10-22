import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RotinaConfirmacaoScreen } from './RotinaConfirmacaoScreen';

// Picker mock that always picks 22:15, so an adjustment is observable.
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      onChange,
    }: {
      onChange: (evento: { type: string }, data?: Date) => void;
    }) => (
      <Pressable
        testID="datetimepicker-mock"
        accessibilityRole="button"
        onPress={() => onChange({ type: 'set' }, new Date(2026, 9, 21, 22, 15))}
      >
        <Text>DateTimePicker</Text>
      </Pressable>
    ),
  };
});

async function montar() {
  const onConfirmar = jest.fn();
  await render(
    <RotinaConfirmacaoScreen
      dormirEstimado="23:00"
      acordarEstimado="07:00"
      onConfirmar={onConfirmar}
    />,
  );
  return { onConfirmar };
}

describe('RotinaConfirmacaoScreen', () => {
  it('CA-01: a tela de confirmação mostra o horário estimado de dormir', async () => {
    await montar();

    expect(screen.getByText('Notamos um padrão')).toBeTruthy();
    expect(screen.getByText('23:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajustar horário' })).toBeTruthy();
    expect(screen.queryByText(/!/)).toBeNull();
    expect(screen.queryByText(/proteção/i)).toBeNull();
  });

  it('CA-02: Confirmar sem ajuste chama onConfirmar sem horários novos', async () => {
    const { onConfirmar } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).toHaveBeenCalledWith();
  });

  it('CA-01: Ajustar horário permite editar dormir e acordar antes de confirmar (RN-04)', async () => {
    const { onConfirmar } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Ajustar horário' }));
    expect(screen.getByText('Dormir: 23:00')).toBeTruthy();
    expect(screen.getByText('Acordar: 07:00')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de dormir' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
    expect(screen.getByText('Dormir: 22:15')).toBeTruthy();
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de acordar' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
    expect(screen.getByText('Acordar: 22:15')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirmar).toHaveBeenCalledWith({
      dormirEstimado: '22:15',
      acordarEstimado: '22:15',
    });
  });

  it('CA-01: o horário de dormir é lido como texto pelo leitor de tela', async () => {
    await montar();

    expect(
      screen.getByLabelText('Horário estimado de dormir: 23:00'),
    ).toBeTruthy();
  });
});
