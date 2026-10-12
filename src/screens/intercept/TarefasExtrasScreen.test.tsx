import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TarefasExtrasScreen } from './TarefasExtrasScreen';
import { Tarefa } from '../../domain/types';

const extra = (id: string, titulo: string): Tarefa => ({
  id,
  titulo,
  essencial: false,
  concluida: false,
});

async function montar(tarefas: Tarefa[], blocoPorTarefaExtra = 1) {
  const props = {
    tarefas,
    blocoPorTarefaExtra,
    onConcluir: jest.fn(),
    onAdicionar: jest.fn(),
    onVoltar: jest.fn(),
  };
  const resultado = await render(<TarefasExtrasScreen {...props} />);
  return { props, ...resultado };
}

describe('TarefasExtrasScreen', () => {
  it('lista as tarefas e conclui pelo id', async () => {
    const { props } = await montar([extra('a', 'Regar a planta'), extra('b', 'Lavar a louça')]);

    expect(screen.getByText('Cada uma concluída rende 1 bloco.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Concluir: Lavar a louça'));
    expect(props.onConcluir).toHaveBeenCalledWith('b');
  });

  it('plural quando cada extra rende mais de um bloco', async () => {
    await montar([], 2);
    expect(screen.getByText('Cada uma concluída rende 2 blocos.')).toBeTruthy();
  });

  it('sem tarefas: mensagem neutra convidando a escrever uma', async () => {
    await montar([]);
    expect(screen.getByText(/Nenhuma tarefa extra por aqui/)).toBeTruthy();
  });

  it('adicionar: desabilitado vazio; com texto envia o título sem espaços e limpa o campo', async () => {
    const { props } = await montar([]);
    const botao = screen.getByRole('button', { name: 'Adicionar' });
    expect(botao.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Nova tarefa extra'), '  Ligar pra vó  ');
    await fireEvent.press(screen.getByText('Adicionar'));

    expect(props.onAdicionar).toHaveBeenCalledWith('Ligar pra vó');
    expect(screen.getByLabelText('Nova tarefa extra').props.value).toBe('');
  });

  it('Voltar chama onVoltar', async () => {
    const { props } = await montar([]);
    await fireEvent.press(screen.getByText('Voltar'));
    expect(props.onVoltar).toHaveBeenCalledTimes(1);
  });
});
