import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddTaskForm } from './AddTaskForm';

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

const propsPadrao = {
  visible: true,
  onFechar: jest.fn(),
  onAdicionar: jest.fn(),
  limiteEssenciaisAtingido: false,
  essenciaisUsadas: 0,
  alternativaNoturna: null,
};

const marcadorEssencial = () =>
  screen.getByRole('switch', { name: 'Essencial' });
const marcadorExercicio = () =>
  screen.getByRole('checkbox', { name: 'Isso é exercício?' });

describe('AddTaskForm', () => {
  it('não renderiza o conteúdo quando visible é false', async () => {
    await render(<AddTaskForm {...propsPadrao} visible={false} />);

    expect(screen.queryByLabelText('Nova alternativa')).toBeNull();
  });

  it('adiciona uma alternativa comum com o título digitado, limpa o campo e fecha o sheet', async () => {
    const onAdicionar = jest.fn();
    const onFechar = jest.fn();
    await render(
      <AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} onFechar={onFechar} />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      '  revisar o capítulo 3  ',
    );
    await fireEvent.press(screen.getByText('Adicionar'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'revisar o capítulo 3',
      false,
      'padrao',
      undefined,
      false,
    );
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('adiciona como essencial quando o marcador está ligado', async () => {
    const onAdicionar = jest.fn();
    await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      'estudar 25 min',
    );
    await fireEvent.press(marcadorEssencial());
    await fireEvent.press(screen.getByText('Adicionar'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'estudar 25 min',
      true,
      'padrao',
      undefined,
      false,
    );
  });

  it('não adiciona nada com o campo vazio, e não fecha o sheet', async () => {
    const onAdicionar = jest.fn();
    const onFechar = jest.fn();
    await render(
      <AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} onFechar={onFechar} />,
    );

    await fireEvent.press(screen.getByText('Adicionar'));

    expect(onAdicionar).not.toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('"Cancelar" fecha o sheet sem adicionar', async () => {
    const onAdicionar = jest.fn();
    const onFechar = jest.fn();
    await render(
      <AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} onFechar={onFechar} />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      'algo',
    );
    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onAdicionar).not.toHaveBeenCalled();
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  describe('HU-07 · contador e teto de essenciais (RN08/RN09)', () => {
    it('sem teto atingido, mostra "{n} de 3 usadas hoje"', async () => {
      await render(<AddTaskForm {...propsPadrao} essenciaisUsadas={2} />);

      expect(screen.getByText('2 de 3 usadas hoje')).toBeTruthy();
      expect(screen.queryByText('Você já tem 3 essenciais hoje.')).toBeNull();
    });

    it('Cenário 8: no teto, desabilita o marcador, avisa e ainda adiciona como comum', async () => {
      const onAdicionar = jest.fn();
      await render(
        <AddTaskForm
          {...propsPadrao}
          onAdicionar={onAdicionar}
          limiteEssenciaisAtingido
          essenciaisUsadas={3}
        />,
      );

      expect(screen.getByText('Você já tem 3 essenciais hoje.')).toBeTruthy();
      expect(marcadorEssencial().props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(marcadorEssencial());
      await fireEvent.changeText(
        screen.getByLabelText('Nova alternativa'),
        'organizar a mesa',
      );
      await fireEvent.press(screen.getByText('Adicionar'));

      expect(onAdicionar).toHaveBeenCalledWith(
        'organizar a mesa',
        false,
        'padrao',
        undefined,
        false,
      );
    });
  });

  describe('HU-07 · sugestões (RN07, Cenários 5-7)', () => {
    it('Cenário 7: sem alternativa noturna, mostra só as 4 sugestões fixas na ordem', async () => {
      await render(<AddTaskForm {...propsPadrao} alternativaNoturna={null} />);

      expect(
        screen.getAllByText(
          /^(Ler 10 páginas|Caminhar 15 min|Alongar 5 min|Arrumar a mesa)$/,
        ),
      ).toHaveLength(4);
      expect(screen.getByText('Ler 10 páginas')).toBeTruthy();
    });

    it('Cenário 6: com alternativa noturna, ela aparece primeiro, antes das 4 fixas', async () => {
      await render(
        <AddTaskForm {...propsPadrao} alternativaNoturna="Ler antes de dormir" />,
      );

      const textosDosChips = screen
        .getAllByText(
          /^(Ler antes de dormir|Ler 10 páginas|Caminhar 15 min|Alongar 5 min|Arrumar a mesa)$/,
        )
        .map(no => no.props.children);

      expect(textosDosChips).toEqual([
        'Ler antes de dormir',
        'Ler 10 páginas',
        'Caminhar 15 min',
        'Alongar 5 min',
        'Arrumar a mesa',
      ]);
    });

    it('Cenário 5: tocar numa sugestão só preenche o título, sem adicionar', async () => {
      const onAdicionar = jest.fn();
      await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

      await fireEvent.press(screen.getByText('Ler 10 páginas'));

      expect(screen.getByLabelText('Nova alternativa').props.value).toBe(
        'Ler 10 páginas',
      );
      expect(onAdicionar).not.toHaveBeenCalled();
    });
  });

  it('o campo de duração só aparece depois de marcar "Isso é exercício?"', async () => {
    await render(<AddTaskForm {...propsPadrao} />);

    expect(screen.queryByLabelText('Duração (min)')).toBeNull();

    await fireEvent.press(marcadorExercicio());

    expect(screen.getByLabelText('Duração (min)')).toBeTruthy();
  });

  it('adiciona um exercício com tipo e duração, e volta ao padrão depois', async () => {
    const onAdicionar = jest.fn();
    await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      'Caminhada leve',
    );
    await fireEvent.press(marcadorExercicio());
    await fireEvent.changeText(screen.getByLabelText('Duração (min)'), '20');
    await fireEvent.press(screen.getByText('Adicionar'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'Caminhada leve',
      false,
      'exercicio',
      20,
      false,
    );
  });

  it('exercício sem duração preenchida: manda tipo "exercicio" e duração undefined', async () => {
    const onAdicionar = jest.fn();
    await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      'Alongar',
    );
    await fireEvent.press(marcadorExercicio());
    await fireEvent.press(screen.getByText('Adicionar'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'Alongar',
      false,
      'exercicio',
      undefined,
      false,
    );
  });

  it('desmarcar "Isso é exercício?" limpa a duração digitada', async () => {
    const onAdicionar = jest.fn();
    await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

    await fireEvent.changeText(
      screen.getByLabelText('Nova alternativa'),
      'Corrida',
    );
    await fireEvent.press(marcadorExercicio());
    await fireEvent.changeText(screen.getByLabelText('Duração (min)'), '30');
    await fireEvent.press(marcadorExercicio()); // desmarca
    await fireEvent.press(marcadorExercicio()); // marca de novo
    await fireEvent.press(screen.getByText('Adicionar'));

    expect(onAdicionar).toHaveBeenCalledWith(
      'Corrida',
      false,
      'exercicio',
      undefined,
      false,
    );
  });

  describe('"Repetir todos os dias" (RN08: desligado por padrão)', () => {
    it('desligado por padrão: manda repetirTodosOsDias false', async () => {
      const onAdicionar = jest.fn();
      await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

      await fireEvent.changeText(screen.getByLabelText('Nova alternativa'), 'Ler');
      await fireEvent.press(screen.getByText('Adicionar'));

      expect(onAdicionar).toHaveBeenCalledWith('Ler', false, 'padrao', undefined, false);
    });

    it('ligado: manda repetirTodosOsDias true', async () => {
      const onAdicionar = jest.fn();
      await render(<AddTaskForm {...propsPadrao} onAdicionar={onAdicionar} />);

      await fireEvent.changeText(
        screen.getByLabelText('Nova alternativa'),
        'Meditar',
      );
      await fireEvent.press(
        screen.getByRole('switch', { name: 'Repetir todos os dias' }),
      );
      await fireEvent.press(screen.getByText('Adicionar'));

      expect(onAdicionar).toHaveBeenCalledWith(
        'Meditar',
        false,
        'padrao',
        undefined,
        true,
      );
    });
  });
});
