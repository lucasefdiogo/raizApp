import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SessaoFocoScreen } from './SessaoFocoScreen';

jest.mock('../../hooks/useFocusSession');
const { useFocusSession } = require('../../hooks/useFocusSession');

const props = {
  uid: 'uid-1',
  duracaoInicialSeg: 120,
  tarefaId: 'tarefa-1',
  origem: 'travado' as const,
  estadoTravado: 'confusao' as const,
  onMarcarTarefaComoFeita: jest.fn(),
  onFechar: jest.fn(),
};

function configurarHook(sobrescritas = {}) {
  useFocusSession.mockReturnValue({
    fase: 'contando',
    duracaoPlanejadaSeg: 120,
    segundosRestantes: 120,
    podeMarcarComoFeita: true,
    continuarMais10Minutos: jest.fn(),
    marcarTarefaComoFeita: jest.fn(),
    pararAqui: jest.fn(),
    ...sobrescritas,
  });
}

describe('SessaoFocoScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHook();
  });

  it('durante a contagem: mostra "Só N minutos. Pode parar depois." e o tempo restante', async () => {
    configurarHook({ segundosRestantes: 95, duracaoPlanejadaSeg: 120 });
    await render(<SessaoFocoScreen {...props} />);

    expect(screen.getByText('Só 2 minutos. Pode parar depois.')).toBeTruthy();
    expect(screen.getByText('1:35')).toBeTruthy();
    expect(screen.queryByText(/minutos feitos/)).toBeNull();
  });

  it('fase concluida: mostra "N minutos feitos. O começo era a parte difícil." e as ações', async () => {
    configurarHook({ fase: 'concluida' });
    await render(<SessaoFocoScreen {...props} />);

    expect(
      screen.getByText('2 minutos feitos. O começo era a parte difícil.'),
    ).toBeTruthy();
    expect(screen.getByText('Continuar mais 10 minutos')).toBeTruthy();
    expect(screen.getByText('Marcar a tarefa como feita')).toBeTruthy();
    expect(screen.getByText('Parar aqui')).toBeTruthy();
  });

  it('"Marcar a tarefa como feita" só aparece quando podeMarcarComoFeita é true', async () => {
    configurarHook({ fase: 'concluida', podeMarcarComoFeita: false });
    await render(<SessaoFocoScreen {...props} />);

    expect(screen.queryByText('Marcar a tarefa como feita')).toBeNull();
  });

  it('"Continuar mais 10 minutos" chama continuarMais10Minutos', async () => {
    const continuarMais10Minutos = jest.fn();
    configurarHook({ fase: 'concluida', continuarMais10Minutos });
    await render(<SessaoFocoScreen {...props} />);

    await fireEvent.press(screen.getByText('Continuar mais 10 minutos'));

    expect(continuarMais10Minutos).toHaveBeenCalledTimes(1);
  });

  it('"Marcar a tarefa como feita" chama marcarTarefaComoFeita, onMarcarTarefaComoFeita e mostra "Feito. Isso conta."', async () => {
    const marcarTarefaComoFeita = jest.fn();
    const onMarcarTarefaComoFeita = jest.fn();
    configurarHook({ fase: 'concluida', marcarTarefaComoFeita });
    await render(
      <SessaoFocoScreen
        {...props}
        onMarcarTarefaComoFeita={onMarcarTarefaComoFeita}
      />,
    );

    await fireEvent.press(screen.getByText('Marcar a tarefa como feita'));

    expect(marcarTarefaComoFeita).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Feito. Isso conta.')).toBeTruthy();
  });

  it('overlay "Feito. Isso conta." fecha sozinho e chama onFechar', async () => {
    jest.useFakeTimers();
    try {
      const onFechar = jest.fn();
      configurarHook({ fase: 'concluida' });
      await render(<SessaoFocoScreen {...props} onFechar={onFechar} />);

      await fireEvent.press(screen.getByText('Marcar a tarefa como feita'));
      expect(onFechar).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(onFechar).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('"Parar aqui" chama pararAqui e onFechar imediatamente, sem overlay', async () => {
    const pararAqui = jest.fn();
    const onFechar = jest.fn();
    configurarHook({ fase: 'concluida', pararAqui });
    await render(<SessaoFocoScreen {...props} onFechar={onFechar} />);

    await fireEvent.press(screen.getByText('Parar aqui'));

    expect(pararAqui).toHaveBeenCalledTimes(1);
    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Feito. Isso conta.')).toBeNull();
  });

  it('nunca mostra um botão de seguir pro app, nem com origem "interceptacao" (HU-04: nenhuma sessão libera app ao terminar)', async () => {
    configurarHook({ fase: 'concluida' });
    await render(<SessaoFocoScreen {...props} origem="interceptacao" />);

    expect(screen.queryByText(/Seguir para o/)).toBeNull();
  });
});
