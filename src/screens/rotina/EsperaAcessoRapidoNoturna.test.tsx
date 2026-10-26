import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EsperaAcessoRapidoNoturna } from './EsperaAcessoRapidoNoturna';
import { Tarefa } from '../../domain/types';

const analyticsMock = require('@react-native-firebase/analytics');

jest.mock('../../services/firestore');
jest.mock('../../services/crashlytics');

const { buscarUsuario } = require('../../services/firestore');

const ROTINA = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  confirmadoEm: '2026-10-20',
};

async function montar(sobrescritas: Record<string, unknown> = {}) {
  const props = {
    uid: 'uid-1',
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    blocosUsados: 1,
    esperaSeg: 5,
    tarefas: [] as Tarefa[],
    onLiberado: jest.fn(),
    onVoltarAoInicio: jest.fn(),
    onAlternativa: jest.fn(),
    onAlternativaDia: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<EsperaAcessoRapidoNoturna {...props} />);
  return { props, ...resultado };
}

describe('HU-11 RN09 · EsperaAcessoRapidoNoturna', () => {
  beforeEach(async () => {
    buscarUsuario.mockReset();
    buscarUsuario.mockResolvedValue({ rotina: ROTINA });
    analyticsMock.__reset();
    await AsyncStorage.clear();
    jest.useFakeTimers({
      doNotFake: [
        'hrtime', 'nextTick', 'setImmediate', 'setInterval',
        'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask',
      ],
      now: new Date(2026, 9, 21, 23, 30, 0),
    });
  });
  afterEach(() => jest.useRealTimers());

  it('dentro da janela, mostra a frase noturna e a alternativa (RN07/RN08)', async () => {
    await montar();
    await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

    expect(screen.getByText('ACESSO RÁPIDO')).toBeTruthy();
    expect(screen.queryByText('Liberando 2 minutos')).toBeNull();
  });

  it('fora da janela, mostra o texto padrão', async () => {
    jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));

    await montar();
    await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

    expect(screen.getByText('Liberando 2 minutos')).toBeTruthy();
  });

  it('enquanto lê a rotina mostra o carregando, sem montar a tela', async () => {
    buscarUsuario.mockReturnValue(new Promise(() => {}));

    await montar();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('intercept-layout')).toBeNull();
  });

  describe('alternativa do dia', () => {
    it('fora da janela, com essencial pendente, mostra o botão com o título da tarefa', async () => {
      jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
      await montar({
        tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      expect(screen.getByText('Abrir o material em vez disso')).toBeTruthy();
    });

    it('tocar na alternativa do dia chama onAlternativaDia, não onLiberado', async () => {
      jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
      const onAlternativaDia = jest.fn();
      const { props } = await montar({
        tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
        onAlternativaDia,
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      await fireEvent.press(screen.getByText('Abrir o material em vez disso'));

      expect(onAlternativaDia).toHaveBeenCalledWith('t1');
      expect(props.onLiberado).not.toHaveBeenCalled();
    });

    it('fora da janela, com essencial pendente, loga intercept_shown com alternativa "tarefa_essencial"', async () => {
      jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
      await montar({
        tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      expect(analyticsMock.logEvent).toHaveBeenCalledWith(
        expect.anything(),
        'intercept_shown',
        { estado_tela: 'B', janela_noturna: false, alternativa: 'tarefa_essencial' },
      );
    });

    it('dentro da janela, sem alternativa noturna cadastrada, loga intercept_shown com alternativa "nenhuma"', async () => {
      buscarUsuario.mockResolvedValue({ rotina: ROTINA });
      await montar({
        tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      expect(analyticsMock.logEvent).toHaveBeenCalledWith(
        expect.anything(),
        'intercept_shown',
        { estado_tela: 'B', janela_noturna: true, alternativa: 'nenhuma' },
      );
    });
  });
});
