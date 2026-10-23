import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

jest.mock('../../hooks/useVoltarFisico', () => ({
  useVoltarFisico: jest.fn(),
}));

const { useVoltarFisico } = require('../../hooks/useVoltarFisico');

async function montar(sobrescritas = {}) {
  const onConfirmar = jest.fn();
  const onAdiar = jest.fn();
  await render(
    <RotinaConfirmacaoScreen
      dormirEstimado="23:30"
      acordarEstimado="07:00"
      onConfirmar={onConfirmar}
      onAdiar={onAdiar}
      {...sobrescritas}
    />,
  );
  return { onConfirmar, onAdiar };
}

describe('HU-10 · RotinaConfirmacaoScreen', () => {
  beforeEach(() => {
    useVoltarFisico.mockClear();
  });

  it('Cenário 3: mostra o padrão identificado, os dois horários e a linha da janela', async () => {
    await montar();

    expect(screen.getByText('PADRÃO IDENTIFICADO')).toBeTruthy();
    expect(
      screen.getByText('Parece que você costuma dormir por volta das 23:30.'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Entre 23:00 e 07:00, abrir as redes vai pedir uma pausa um pouco maior.',
      ),
    ).toBeTruthy();
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

  it('Cenário 6: Ajustar horário muda o eyebrow/título e recalcula a janela ao vivo', async () => {
    const { onConfirmar } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Ajustar horário' }));

    expect(screen.getByText('AJUSTAR HORÁRIO')).toBeTruthy();
    expect(screen.getByText('Quando você costuma dormir e acordar?')).toBeTruthy();
    expect(screen.getByText('Dormir: 23:30')).toBeTruthy();
    expect(screen.getByText('Acordar: 07:00')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de dormir' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    expect(screen.getByText('Dormir: 22:15')).toBeTruthy();
    expect(
      screen.getByText(
        'Entre 21:45 e 07:00, abrir as redes vai pedir uma pausa um pouco maior.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirmar).toHaveBeenCalledWith({
      dormirEstimado: '22:15',
      acordarEstimado: '07:00',
    });
  });

  it('RN07: "Usar o horário estimado" volta aos valores calculados e ao modo leitura', async () => {
    const { onConfirmar } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Ajustar horário' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de dormir' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
    expect(screen.getByText('Dormir: 22:15')).toBeTruthy();

    await fireEvent.press(screen.getByText('Usar o horário estimado'));

    expect(
      screen.getByText('Parece que você costuma dormir por volta das 23:30.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirmar).toHaveBeenCalledWith();
  });

  it('Cenário 7: horários iguais desabilitam Confirmar e mostram o aviso', async () => {
    await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Ajustar horário' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de acordar' }),
    );
    // picker mock sempre escolhe 22:15, igual ao dormir ajustado em seguida
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de dormir' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    expect(
      screen.getByText('Os horários de dormir e acordar precisam ser diferentes.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar' }).props.accessibilityState).toMatchObject(
      { disabled: true },
    );
  });

  it('CA-01: o horário de dormir é lido como texto pelo leitor de tela', async () => {
    await montar();

    expect(
      screen.getByLabelText('Horário estimado de dormir: 23:30'),
    ).toBeTruthy();
  });

  it('HU-10 RN09/Cenário 8: o voltar físico chama onAdiar, não onConfirmar', async () => {
    const { onConfirmar, onAdiar } = await montar();

    const handler = useVoltarFisico.mock.calls[0][0];
    await act(async () => {
      handler();
    });

    expect(onAdiar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
