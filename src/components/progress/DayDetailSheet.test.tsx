import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DayDetailSheet } from './DayDetailSheet';
import { Tarefa } from '../../domain/types';

// Lê useSafeAreaInsets (mesmo padrão de espaçamento do TaskActionsSheet).
function render(ui: React.ReactElement) {
  return rtlRender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

const TAREFAS: Tarefa[] = [
  { id: '1', titulo: 'Ler 5 páginas', essencial: true, concluida: true },
  { id: '2', titulo: 'Guardar o celular no almoço', essencial: false, concluida: false },
];

describe('DayDetailSheet', () => {
  it('mostra o label do dia e o status por extenso', async () => {
    await render(
      <DayDetailSheet
        visible
        label="Quarta-feira"
        status="cumprido"
        tarefas={TAREFAS}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Quarta-feira · cumprido')).toBeTruthy();
  });

  it('mostra o status "protegido pelo escudo" por extenso', async () => {
    await render(
      <DayDetailSheet
        visible
        label="Terça-feira"
        status="protegido_escudo"
        tarefas={[]}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Terça-feira · protegido pelo escudo')).toBeTruthy();
  });

  it('lista todas as tarefas do dia, com o título de cada uma', async () => {
    await render(
      <DayDetailSheet
        visible
        label="Quarta-feira"
        status="cumprido"
        tarefas={TAREFAS}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Ler 5 páginas')).toBeTruthy();
    expect(screen.getByText('Guardar o celular no almoço')).toBeTruthy();
  });

  it('reflete concluida em cada checkbox, sem nenhum toggle funcional', async () => {
    await render(
      <DayDetailSheet
        visible
        label="Quarta-feira"
        status="cumprido"
        tarefas={TAREFAS}
        onClose={jest.fn()}
      />,
    );

    const checkboxes = screen.getAllByTestId('day-detail-checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].props.accessibilityLabel).toBe('concluída');
    expect(checkboxes[1].props.accessibilityLabel).toBe('não concluída');

    // não é um Pressable/checkbox interativo — não tem accessibilityRole
    // de botão/checkbox, nem onPress.
    expect(checkboxes[0].props.accessibilityRole).toBeUndefined();
    expect(checkboxes[0].props.onPress).toBeUndefined();

    // tocar não deveria fazer nada, e nenhuma função de alternar existe
    // pra ser chamada — só confirma que o toque não derruba a tela.
    fireEvent.press(checkboxes[0]);
    expect(screen.getByText('Ler 5 páginas')).toBeTruthy();
  });

  it('sem tarefas: mostra a mensagem de "nenhuma tarefa registrada", sem lista vazia', async () => {
    await render(
      <DayDetailSheet
        visible
        label="Sexta-feira"
        status="perdido"
        tarefas={[]}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Nenhuma tarefa registrada nesse dia.'),
    ).toBeTruthy();
    expect(screen.queryAllByTestId('day-detail-checkbox')).toHaveLength(0);
  });

  it('não renderiza o conteúdo quando visible é false', async () => {
    await render(
      <DayDetailSheet
        visible={false}
        label="Quarta-feira"
        status="cumprido"
        tarefas={TAREFAS}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByText('Ler 5 páginas')).toBeNull();
  });

  it('"Fechar" chama onClose', async () => {
    const onClose = jest.fn();
    await render(
      <DayDetailSheet
        visible
        label="Quarta-feira"
        status="cumprido"
        tarefas={TAREFAS}
        onClose={onClose}
      />,
    );

    await fireEvent.press(screen.getByText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
