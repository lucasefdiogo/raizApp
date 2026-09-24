import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { TravadoFlowScreen } from './TravadoFlowScreen';
import { Tarefa } from '../../domain/types';

jest.mock('./SessaoFocoScreen', () => ({
  SessaoFocoScreen: (propsRecebidas: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return <Text testID="sessao-foco-mock">{JSON.stringify(propsRecebidas)}</Text>;
  },
}));
jest.mock('../../services/analytics');

const TAREFA_CONTEXTO: Tarefa = {
  id: 'tarefa-1',
  titulo: 'Escrever relatório',
  essencial: true,
  concluida: false,
};

function props(sobrescritas: Partial<React.ComponentProps<typeof TravadoFlowScreen>> = {}) {
  return {
    uid: 'uid-1',
    tarefaContexto: TAREFA_CONTEXTO,
    tarefas: [TAREFA_CONTEXTO],
    origem: 'travado' as const,
    criarSubtarefa: jest.fn().mockReturnValue('subtarefa-1'),
    editarTarefa: jest.fn(),
    moverTarefaParaAmanha: jest.fn().mockResolvedValue(undefined),
    alternarTarefa: jest.fn(),
    onFechar: jest.fn(),
    ...sobrescritas,
  };
}

describe('TravadoFlowScreen', () => {
  it('passo escolha: mostra a pergunta e os 4 chips', async () => {
    await render(<TravadoFlowScreen {...props()} />);

    expect(screen.getByText('O que está pegando agora?')).toBeTruthy();
    expect(screen.getByText('Não sei por onde começar')).toBeTruthy();
    expect(screen.getByText('Tenho medo de ficar ruim')).toBeTruthy();
    expect(screen.getByText('Está chato demais')).toBeTruthy();
    expect(screen.getByText('Estou sem energia')).toBeTruthy();
  });

  it('"Fechar" chama onFechar', async () => {
    const onFechar = jest.fn();
    await render(<TravadoFlowScreen {...props({ onFechar })} />);

    await fireEvent.press(screen.getByText('Fechar'));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  describe('confusao', () => {
    it('mostra o texto e o campo, com "Fazer agora" desabilitado até digitar', async () => {
      await render(<TravadoFlowScreen {...props()} />);
      await fireEvent.press(screen.getByText('Não sei por onde começar'));

      expect(
        screen.getByText(
          'Qual é o primeiro passo físico? Algo que dá para fazer em 2 minutos.',
        ),
      ).toBeTruthy();
      const botao = screen.getByRole('button', { name: 'Fazer agora' });
      expect(botao.props.accessibilityState?.disabled).toBe(true);
    });

    it('preenchido: cria a subtarefa com tarefaPaiId e abre a SessaoFocoScreen com 120s', async () => {
      const criarSubtarefa = jest.fn().mockReturnValue('subtarefa-1');
      await render(<TravadoFlowScreen {...props({ criarSubtarefa })} />);

      await fireEvent.press(screen.getByText('Não sei por onde começar'));
      await fireEvent.changeText(
        screen.getByLabelText('Primeiro passo'),
        'abrir o arquivo',
      );
      await fireEvent.press(screen.getByText('Fazer agora'));

      expect(criarSubtarefa).toHaveBeenCalledWith('abrir o arquivo', 'tarefa-1');
      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 120,
        tarefaId: 'subtarefa-1',
        estadoTravado: 'confusao',
      });
    });
  });

  describe('medo', () => {
    it('"Começar rascunho" abre a SessaoFocoScreen com 300s e a tarefa de contexto', async () => {
      await render(<TravadoFlowScreen {...props()} />);
      await fireEvent.press(screen.getByText('Tenho medo de ficar ruim'));

      expect(
        screen.getByText('Faça a versão feia primeiro. Ninguém vai ver o rascunho.'),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Começar rascunho'));

      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({
        duracaoInicialSeg: 300,
        tarefaId: 'tarefa-1',
        estadoTravado: 'medo',
      });
    });
  });

  describe('tedio', () => {
    it('"Começar" abre a SessaoFocoScreen com 300s', async () => {
      await render(<TravadoFlowScreen {...props()} />);
      await fireEvent.press(screen.getByText('Está chato demais'));

      expect(
        screen.getByText('Não precisa gostar. São 5 minutos, e você pode parar depois.'),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Começar'));

      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({ duracaoInicialSeg: 300, estadoTravado: 'tedio' });
    });
  });

  describe('energia', () => {
    it('com tarefa de contexto: mostra as 3 opções', async () => {
      await render(<TravadoFlowScreen {...props()} />);
      await fireEvent.press(screen.getByText('Estou sem energia'));

      expect(screen.getByText('Fazer uma versão menor')).toBeTruthy();
      expect(
        screen.getByText('Descansar 10 minutos longe do celular'),
      ).toBeTruthy();
      expect(screen.getByText('Passar para amanhã')).toBeTruthy();
    });

    it('sem tarefa de contexto: só "Descansar 10 minutos" aparece', async () => {
      await render(
        <TravadoFlowScreen {...props({ tarefaContexto: null, tarefas: [] })} />,
      );
      await fireEvent.press(screen.getByText('Estou sem energia'));

      expect(screen.queryByText('Fazer uma versão menor')).toBeNull();
      expect(
        screen.getByText('Descansar 10 minutos longe do celular'),
      ).toBeTruthy();
      expect(screen.queryByText('Passar para amanhã')).toBeNull();
    });

    it('"Descansar 10 minutos" abre a SessaoFocoScreen com 600s', async () => {
      await render(<TravadoFlowScreen {...props()} />);
      await fireEvent.press(screen.getByText('Estou sem energia'));
      await fireEvent.press(
        screen.getByText('Descansar 10 minutos longe do celular'),
      );

      const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
      expect(mock).toMatchObject({ duracaoInicialSeg: 600, estadoTravado: 'energia' });
    });

    it('"Fazer uma versão menor" abre o campo pré-preenchido e salva via editarTarefa', async () => {
      const editarTarefa = jest.fn();
      const onFechar = jest.fn();
      await render(
        <TravadoFlowScreen {...props({ editarTarefa, onFechar })} />,
      );
      await fireEvent.press(screen.getByText('Estou sem energia'));
      await fireEvent.press(screen.getByText('Fazer uma versão menor'));

      expect(screen.getByDisplayValue('Escrever relatório')).toBeTruthy();

      await fireEvent.changeText(
        screen.getByLabelText('Versão menor da tarefa'),
        'Só o título',
      );
      await fireEvent.press(screen.getByText('Salvar'));

      expect(editarTarefa).toHaveBeenCalledWith('tarefa-1', {
        titulo: 'Só o título',
      });
      expect(onFechar).toHaveBeenCalledTimes(1);
    });

    it('"Passar para amanhã" chama moverTarefaParaAmanha (com quando, se informado) e fecha', async () => {
      const moverTarefaParaAmanha = jest.fn().mockResolvedValue(undefined);
      const onFechar = jest.fn();
      await render(
        <TravadoFlowScreen {...props({ moverTarefaParaAmanha, onFechar })} />,
      );
      await fireEvent.press(screen.getByText('Estou sem energia'));
      await fireEvent.press(screen.getByText('Passar para amanhã'));
      await fireEvent.changeText(screen.getByLabelText('Horário (opcional)'), '09:00');

      await act(async () => {
        await fireEvent.press(screen.getAllByText('Passar para amanhã').at(-1)!);
      });

      expect(moverTarefaParaAmanha).toHaveBeenCalledWith(TAREFA_CONTEXTO, '09:00');
      expect(onFechar).toHaveBeenCalledTimes(1);
    });
  });

  it('"Voltar" no passo resposta retorna pro passo escolha', async () => {
    await render(<TravadoFlowScreen {...props()} />);
    await fireEvent.press(screen.getByText('Está chato demais'));
    expect(screen.getByText('Voltar')).toBeTruthy();

    await fireEvent.press(screen.getByText('Voltar'));

    expect(screen.getByText('O que está pegando agora?')).toBeTruthy();
  });
});
