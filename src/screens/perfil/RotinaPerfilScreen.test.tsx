import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RotinaPerfilScreen } from './RotinaPerfilScreen';
import type { Rotina } from '../../domain/types';

jest.mock('../../hooks/useRotina');
jest.mock('../../hooks/useAcessoUso');

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
const { useAcessoUso } = require('../../hooks/useAcessoUso');

const ROTINA: Rotina = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  confirmadoEm: '2026-10-20',
  modoManual: false,
};

// Stateful fake que espelha as atualizações locais do hook real.
function simularHook(
  inicial: Rotina | null,
  acoes: Record<string, jest.Mock>,
  extras: Record<string, unknown> = {},
) {
  useRotina.mockImplementation(() => {
    const [rotina, setRotina] = useState<Rotina | null>(inicial);
    return {
      carregando: false,
      rotina,
      estimativa: null,
      diasComDados: 0,
      mostrarConfirmacao: false,
      perguntarAlternativa: false,
      dispensarAlternativa: jest.fn(),
      confirmar: async (horarios?: { dormirEstimado: string; acordarEstimado: string }) => {
        await acoes.confirmar(horarios);
        if (horarios) {
          setRotina({
            ...horarios,
            confirmadoEm: '2026-10-22',
            modoManual: true,
          });
        }
      },
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
      ...extras,
    };
  });
}

function novasAcoes() {
  return {
    confirmar: jest.fn().mockResolvedValue(undefined),
    salvarAlternativa: jest.fn().mockResolvedValue(undefined),
    editarHorarioManual: jest.fn().mockResolvedValue(undefined),
    recalcularAutomaticamente: jest.fn().mockResolvedValue(undefined),
  };
}

async function montar(props: Partial<Record<string, unknown>> = {}) {
  const onVoltar = jest.fn();
  const aoAbrirMedirTempo = jest.fn();
  await render(
    <RotinaPerfilScreen
      uid="u1"
      onVoltar={onVoltar}
      aoAbrirMedirTempo={aoAbrirMedirTempo}
      {...props}
    />,
  );
  return { onVoltar, aoAbrirMedirTempo };
}

describe('HU-10 · RotinaPerfilScreen', () => {
  beforeEach(() => {
    useAcessoUso.mockReturnValue({ concedido: true, carregando: false });
  });

  describe('RN13: rotina já confirmada', () => {
    it('mostra o selo AUTOMÁTICO quando modoManual é falso', async () => {
      simularHook(ROTINA, novasAcoes());
      await montar();

      expect(screen.getByText('AUTOMÁTICO')).toBeTruthy();
      expect(screen.queryByText('AJUSTADO À MÃO')).toBeNull();
    });

    it('mostra o selo AJUSTADO À MÃO quando modoManual é verdadeiro', async () => {
      simularHook({ ...ROTINA, modoManual: true }, novasAcoes());
      await montar();

      expect(screen.getByText('AJUSTADO À MÃO')).toBeTruthy();
    });

    it('mostra a linha "Pausa maior entre..." com os horários atuais', async () => {
      simularHook(ROTINA, novasAcoes());
      await montar();

      expect(
        screen.getByText('Pausa maior entre 22:30 e 07:00, todos os dias.'),
      ).toBeTruthy();
    });

    it('Cenário 12: editar o horário e tocar Salvar grava modoManual verdadeiro e atualiza a pausa maior', async () => {
      const acoes = novasAcoes();
      simularHook(ROTINA, acoes);
      await montar();

      await fireEvent.press(
        screen.getByRole('button', { name: 'Alterar horário de acordar' }),
      );
      await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(acoes.editarHorarioManual).toHaveBeenCalledWith({
        acordarEstimado: '22:15',
      });
      expect(screen.getByText('AJUSTADO À MÃO')).toBeTruthy();
      expect(
        screen.getByText('Pausa maior entre 22:30 e 22:15, todos os dias.'),
      ).toBeTruthy();
    });

    it('Cenário 13: editar só a alternativa e tocar Salvar não chama editarHorarioManual nem muda o selo', async () => {
      const acoes = novasAcoes();
      simularHook(ROTINA, acoes);
      await montar();

      await fireEvent.changeText(
        screen.getByLabelText('No lugar da tela, à noite'),
        'Preparar o dia de amanhã',
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(acoes.editarHorarioManual).not.toHaveBeenCalled();
      expect(acoes.salvarAlternativa).toHaveBeenCalledWith('Preparar o dia de amanhã');
      expect(screen.getByText('AUTOMÁTICO')).toBeTruthy();
    });

    it('Salvar sem nenhuma mudança não chama editarHorarioManual nem salvarAlternativa', async () => {
      const acoes = novasAcoes();
      simularHook({ ...ROTINA, alternativaNoturna: 'Ler um livro' }, acoes);
      await montar();

      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(acoes.editarHorarioManual).not.toHaveBeenCalled();
      expect(acoes.salvarAlternativa).not.toHaveBeenCalled();
    });

    it('RN15: Recalcular automaticamente só aparece com modoManual verdadeiro e chama o hook', async () => {
      const acoes = novasAcoes();
      simularHook({ ...ROTINA, modoManual: true }, acoes);
      await montar();

      await fireEvent.press(
        screen.getByRole('button', { name: 'Recalcular automaticamente' }),
      );

      expect(acoes.recalcularAutomaticamente).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('button', { name: 'Recalcular automaticamente' }),
      ).toBeNull();
    });

    it('sem modoManual, Recalcular automaticamente não aparece', async () => {
      simularHook(ROTINA, novasAcoes());
      await montar();

      expect(
        screen.queryByRole('button', { name: 'Recalcular automaticamente' }),
      ).toBeNull();
    });

    it('CA-03: mostra a alternativa salva e permite editar', async () => {
      simularHook({ ...ROTINA, alternativaNoturna: 'Ler um livro' }, novasAcoes());
      await montar();

      expect(screen.getByLabelText('No lugar da tela, à noite').props.value).toBe(
        'Ler um livro',
      );
    });
  });

  describe('RN14: rotina ainda não confirmada', () => {
    it('sem acesso de uso, mostra "Precisa medir o tempo nas redes" e o link "Medir tempo nas redes"', async () => {
      useAcessoUso.mockReturnValue({ concedido: false, carregando: false });
      simularHook(null, novasAcoes());
      const { aoAbrirMedirTempo } = await montar();

      expect(screen.getByText('Precisa medir o tempo nas redes')).toBeTruthy();

      await fireEvent.press(screen.getByText('Medir tempo nas redes'));
      expect(aoAbrirMedirTempo).toHaveBeenCalledTimes(1);
    });

    it('com acesso de uso e poucos dias, mostra "Aprendendo seu horário"', async () => {
      simularHook(null, novasAcoes(), { diasComDados: 3 });
      await montar();

      expect(screen.getByText('Aprendendo seu horário · 3 de 5 dias')).toBeTruthy();
      expect(screen.queryByText('Medir tempo nas redes')).toBeNull();
    });

    it('Cenário 16: permite definir os horários à mão (default 23:00/07:00) e Salvar confirma com modoManual verdadeiro', async () => {
      const acoes = novasAcoes();
      simularHook(null, acoes, { diasComDados: 3 });
      await montar();

      expect(screen.getByText('Dormir: 23:00')).toBeTruthy();
      expect(screen.getByText('Acordar: 07:00')).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('button', { name: 'Alterar horário de acordar' }),
      );
      await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(acoes.confirmar).toHaveBeenCalledWith({
        dormirEstimado: '23:00',
        acordarEstimado: '22:15',
      });
    });
  });

  it('carregando mostra o indicador e não o conteúdo', async () => {
    useRotina.mockReturnValue({ carregando: true, rotina: null, diasComDados: 0 });
    await montar();

    expect(screen.queryByText('Rotina noturna')).toBeNull();
  });

  it('Voltar chama onVoltar', async () => {
    simularHook(ROTINA, novasAcoes());
    const { onVoltar } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(onVoltar).toHaveBeenCalledTimes(1);
  });
});
