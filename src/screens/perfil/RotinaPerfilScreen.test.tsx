import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RotinaPerfilScreen } from './RotinaPerfilScreen';
import type { Rotina } from '../../domain/types';

jest.mock('../../hooks/useRotina');

// Picker mock that always picks 22:15, so an edit is observable.
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

const { useRotina } = require('../../hooks/useRotina');

const ROTINA: Rotina = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  confirmadoEm: '2026-10-20',
  modoManual: false,
};

// Stateful fake that mirrors the real hook's local updates.
function simularHook(inicial: Rotina | null, acoes: Record<string, jest.Mock>) {
  useRotina.mockImplementation(() => {
    const [rotina, setRotina] = useState<Rotina | null>(inicial);
    return {
      carregando: false,
      rotina,
      estimativa: null,
      mostrarConfirmacao: false,
      perguntarAlternativa: false,
      dispensarAlternativa: jest.fn(),
      confirmar: jest.fn(),
      salvarAlternativa: async (texto: string) => {
        await acoes.salvarAlternativa(texto);
        setRotina(atual => (atual ? { ...atual, alternativaNoturna: texto } : atual));
      },
      editarHorarioManual: async (campos: object) => {
        await acoes.editarHorarioManual(campos);
        setRotina(atual => (atual ? { ...atual, ...campos, modoManual: true } : atual));
      },
      recalcularAutomaticamente: async () => {
        await acoes.recalcularAutomaticamente();
        setRotina(atual => (atual ? { ...atual, modoManual: false } : atual));
      },
    };
  });
}

function novasAcoes() {
  return {
    salvarAlternativa: jest.fn().mockResolvedValue(undefined),
    editarHorarioManual: jest.fn().mockResolvedValue(undefined),
    recalcularAutomaticamente: jest.fn().mockResolvedValue(undefined),
  };
}

describe('RotinaPerfilScreen', () => {
  it('CA-08: editar o horário de dormir no Perfil marca modoManual e mantém o horário', async () => {
    const acoes = novasAcoes();
    simularHook(ROTINA, acoes);
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de dormir' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    expect(acoes.editarHorarioManual).toHaveBeenCalledWith({
      dormirEstimado: '22:15',
    });
    expect(screen.getByText('Dormir: 22:15')).toBeTruthy();
    expect(screen.getByText('Acordar: 07:00')).toBeTruthy();
    expect(screen.getByText('Horários ajustados por você')).toBeTruthy();
  });

  it('CA-08: editar o horário de acordar grava só o campo editado', async () => {
    const acoes = novasAcoes();
    simularHook(ROTINA, acoes);
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Alterar horário de acordar' }),
    );
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    expect(acoes.editarHorarioManual).toHaveBeenCalledWith({
      acordarEstimado: '22:15',
    });
  });

  it('CA-08: Recalcular automaticamente limpa modoManual', async () => {
    const acoes = novasAcoes();
    simularHook({ ...ROTINA, modoManual: true }, acoes);
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Recalcular automaticamente' }),
    );

    expect(acoes.recalcularAutomaticamente).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Horários ajustados por você')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Recalcular automaticamente' }),
    ).toBeNull();
  });

  it('CA-08: sem modoManual, Recalcular automaticamente não aparece', async () => {
    simularHook(ROTINA, novasAcoes());
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Recalcular automaticamente' }),
    ).toBeNull();
  });

  it('CA-03: editar a alternativa noturna no Perfil grava rotina.alternativaNoturna', async () => {
    const acoes = novasAcoes();
    simularHook({ ...ROTINA, alternativaNoturna: 'Ler um livro' }, acoes);
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    const campo = screen.getByLabelText('Alternativa noturna');
    expect(campo.props.value).toBe('Ler um livro');
    await fireEvent.changeText(campo, 'Alongar');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(acoes.salvarAlternativa).toHaveBeenCalledWith('Alongar');
  });

  it('sem rotina mostra texto neutro e nenhum campo de edição', async () => {
    simularHook(null, novasAcoes());
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    expect(
      screen.getByText(/a rotina aparece aqui depois de alguns dias de uso/i),
    ).toBeTruthy();
    expect(screen.queryByText(/Dormir:/)).toBeNull();
    expect(screen.queryByLabelText('Alternativa noturna')).toBeNull();
  });

  it('carregando mostra o indicador e não o conteúdo', async () => {
    useRotina.mockReturnValue({ carregando: true, rotina: null });
    await render(<RotinaPerfilScreen uid="u1" onVoltar={jest.fn()} />);

    expect(screen.queryByText('Rotina noturna')).toBeNull();
  });

  it('Voltar chama onVoltar', async () => {
    simularHook(ROTINA, novasAcoes());
    const onVoltar = jest.fn();
    await render(<RotinaPerfilScreen uid="u1" onVoltar={onVoltar} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(onVoltar).toHaveBeenCalledTimes(1);
  });
});
