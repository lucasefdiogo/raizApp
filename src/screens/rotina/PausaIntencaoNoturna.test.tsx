import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PausaIntencaoNoturna } from './PausaIntencaoNoturna';
import { MENSAGENS_NOTURNAS } from '../../domain/mensagensNoturnas';
import { Tarefa } from '../../domain/types';

jest.mock('../../services/firestore');
jest.mock('../../services/crashlytics');

const { buscarUsuario } = require('../../services/firestore');

const ROTINA = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  confirmadoEm: '2026-10-20',
};

function montarPausa(sobrescritas: Record<string, unknown> = {}) {
  const props = {
    uid: 'uid-1',
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    blocosUsados: 1,
    duracaoBlocoMin: 15,
    duracaoPadraoSeg: 20,
    saldo: null as number | null,
    tarefas: [] as Tarefa[],
    onLiberar: jest.fn(),
    onAgoraNao: jest.fn(),
    onAlternativaNoturna: jest.fn(),
    onAlternativaDia: jest.fn(),
    ...sobrescritas,
  };
  return render(<PausaIntencaoNoturna {...props} />);
}

describe('PausaIntencaoNoturna', () => {
  beforeEach(async () => {
    buscarUsuario.mockReset();
    buscarUsuario.mockResolvedValue({ rotina: ROTINA });
    await AsyncStorage.clear();
    // Fake only Date so waitFor keeps working.
    jest.useFakeTimers({
      doNotFake: ['hrtime', 'nextTick', 'setImmediate', 'setInterval',
        'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask'],
      now: new Date(2026, 9, 21, 23, 30, 0),
    });
  });
  afterEach(() => jest.useRealTimers());

  it('CA-05: duas aberturas seguidas mostram mensagens diferentes', async () => {
    const primeira = await montarPausa();
    await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());
    const textoA = MENSAGENS_NOTURNAS.find(m => screen.queryByText(m));
    expect(textoA).toBeTruthy();
    await primeira.unmount();

    await montarPausa();
    await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());
    const textoB = MENSAGENS_NOTURNAS.find(m => screen.queryByText(m));
    expect(textoB).toBeTruthy();

    expect(textoB).not.toBe(textoA);
  });

  it('CA-06: fora da janela mostra o texto padrão e a duração da HU-04', async () => {
    jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));

    await montarPausa();
    await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

    expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
    expect(screen.getByText('Liberar em 0:20')).toBeTruthy();
    expect(screen.queryByText('Você está perto do seu horário de dormir.')).toBeNull();
  });

  it('CA-06: enquanto lê a rotina mostra o carregando, sem montar a pausa', async () => {
    buscarUsuario.mockReturnValue(new Promise(() => {}));

    await montarPausa();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('intercept-layout')).toBeNull();
  });

  describe('alternativa do dia', () => {
    it('fora da janela, com essencial pendente, mostra o botão com o título da tarefa', async () => {
      jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
      await montarPausa({
        tarefas: [
          { id: 't1', titulo: 'Abrir o material de estudo', essencial: true, concluida: false },
        ],
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      expect(screen.getByText('Abrir o material de estudo em vez disso')).toBeTruthy();
    });

    it('fora da janela, sem tarefa pendente, não mostra botão de alternativa', async () => {
      jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
      await montarPausa({ tarefas: [] });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      expect(screen.queryByText(/em vez disso/)).toBeNull();
    });

    it('tocar na alternativa do dia chama onAlternativaDia com o id da tarefa', async () => {
      jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
      const onAlternativaDia = jest.fn();
      await montarPausa({
        tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
        onAlternativaDia,
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      await fireEvent.press(screen.getByText('Abrir o material em vez disso'));

      expect(onAlternativaDia).toHaveBeenCalledWith('t1');
    });

    it('dentro da janela, com tarefa pendente mas sem alternativa noturna, não mostra botão', async () => {
      buscarUsuario.mockResolvedValue({ rotina: ROTINA });
      await montarPausa({
        tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
      });
      await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

      expect(screen.queryByText(/em vez disso/)).toBeNull();
    });
  });
});
