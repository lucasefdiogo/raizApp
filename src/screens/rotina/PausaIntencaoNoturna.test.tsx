import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PausaIntencaoNoturna } from './PausaIntencaoNoturna';
import { MENSAGENS_NOTURNAS } from '../../domain/mensagensNoturnas';

jest.mock('../../services/firestore');
jest.mock('../../services/crashlytics');

const { buscarUsuario } = require('../../services/firestore');

const ROTINA = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  confirmadoEm: '2026-10-20',
};

function montarPausa() {
  return render(
    <PausaIntencaoNoturna
      uid="uid-1"
      appLabel="Instagram"
      blocosUsados={1}
      duracaoPadraoSeg={20}
      saldo={null}
      onLiberar={jest.fn()}
      onAgoraNao={jest.fn()}
      onAlternativaNoturna={jest.fn()}
    />,
  );
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
    await waitFor(() => expect(screen.queryByTestId('pausa-intencao')).toBeTruthy());
    const textoA = MENSAGENS_NOTURNAS.find(m => screen.queryByText(m));
    expect(textoA).toBeTruthy();
    await primeira.unmount();

    await montarPausa();
    await waitFor(() => expect(screen.queryByTestId('pausa-intencao')).toBeTruthy());
    const textoB = MENSAGENS_NOTURNAS.find(m => screen.queryByText(m));
    expect(textoB).toBeTruthy();

    expect(textoB).not.toBe(textoA);
  });

  it('CA-06: fora da janela mostra o texto padrão e a duração da HU-04', async () => {
    jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));

    await montarPausa();
    await waitFor(() => expect(screen.queryByTestId('pausa-intencao')).toBeTruthy());

    expect(screen.getByText('O que você vai fazer agora?')).toBeTruthy();
    expect(screen.getByText('Liberar em 20s')).toBeTruthy();
    expect(screen.queryByText('Você está perto do seu horário de dormir.')).toBeNull();
  });

  it('CA-06: enquanto lê a rotina mostra o carregando, sem montar a pausa', async () => {
    buscarUsuario.mockReturnValue(new Promise(() => {}));

    await montarPausa();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('pausa-intencao')).toBeNull();
  });
});
