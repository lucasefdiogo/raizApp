import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TaskActionsSheet } from './TaskActionsSheet';

const props = {
  visible: true,
  tituloTarefa: 'Caminhada leve',
  onEditar: jest.fn(),
  onExcluir: jest.fn(),
  onCancelar: jest.fn(),
};

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

describe('TaskActionsSheet', () => {
  it('mostra o título da tarefa e as três ações quando visível', async () => {
    await render(<TaskActionsSheet {...props} />);

    expect(screen.getByText('Caminhada leve')).toBeTruthy();
    expect(screen.getByText('Editar')).toBeTruthy();
    expect(screen.getByText('Excluir')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('não renderiza o conteúdo quando visible é false', async () => {
    await render(<TaskActionsSheet {...props} visible={false} />);

    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Excluir')).toBeNull();
  });

  it('"Editar" chama onEditar e nada mais', async () => {
    const onEditar = jest.fn();
    const onExcluir = jest.fn();
    await render(
      <TaskActionsSheet {...props} onEditar={onEditar} onExcluir={onExcluir} />,
    );

    await fireEvent.press(screen.getByText('Editar'));

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onExcluir).not.toHaveBeenCalled();
  });

  it('"Excluir" chama onExcluir', async () => {
    const onExcluir = jest.fn();
    await render(<TaskActionsSheet {...props} onExcluir={onExcluir} />);

    await fireEvent.press(screen.getByText('Excluir'));

    expect(onExcluir).toHaveBeenCalledTimes(1);
  });

  it('"Cancelar" chama onCancelar', async () => {
    const onCancelar = jest.fn();
    await render(<TaskActionsSheet {...props} onCancelar={onCancelar} />);

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('omite a linha "Editar" quando onEditar não é passado', async () => {
    await render(<TaskActionsSheet {...props} onEditar={undefined} />);

    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.getByText('Excluir')).toBeTruthy();
  });

  it('omite a linha "Excluir" quando onExcluir não é passado', async () => {
    await render(<TaskActionsSheet {...props} onExcluir={undefined} />);

    expect(screen.queryByText('Excluir')).toBeNull();
    expect(screen.getByText('Editar')).toBeTruthy();
  });
});
