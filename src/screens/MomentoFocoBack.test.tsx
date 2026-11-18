import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MomentoFocoScreen } from './MomentoFocoScreen';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('../services/analytics');
jest.mock('../native/AccessibilityDetection');

const { registrarSessaoFocoNoDia } = require('../services/firestore');
const { iniciarMomentoFoco } = require('../native/AccessibilityDetection');

describe('MomentoFocoScreen no Android', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registrarSessaoFocoNoDia.mockResolvedValue(undefined);
    iniciarMomentoFoco.mockResolvedValue(true);
  });

  it('Voltar durante a contagem dispara o registro da parada e fecha', async () => {
    const onFechar = jest.fn();
    await render(
      <MomentoFocoScreen
        uid="uid-1"
        tarefa={{ id: 'tarefa-1', titulo: 'Abrir o material', essencial: false, concluida: false }}
        onEstouTravado={jest.fn()}
        onMarcarTarefaComoFeita={jest.fn()}
        onFechar={onFechar}
      />,
    );
    await fireEvent.press(screen.getByText('Iniciar momento de foco'));
    await fireEvent(screen.getByTestId('momento-foco-modal'), 'requestClose');

    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalledWith(
      'uid-1', expect.any(String), expect.objectContaining({
        tarefaId: 'tarefa-1', resultado: 'parou',
      }),
    ));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
