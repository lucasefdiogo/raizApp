import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EsperaAcessoRapidoNoturna } from './EsperaAcessoRapidoNoturna';

jest.mock('../../services/firestore');
jest.mock('../../services/crashlytics');

const { buscarUsuario } = require('../../services/firestore');

const ROTINA = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  confirmadoEm: '2026-10-20',
};

function montar(sobrescritas = {}) {
  const props = {
    uid: 'uid-1',
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    blocosUsados: 1,
    esperaSeg: 5,
    onLiberado: jest.fn(),
    onVoltarAoInicio: jest.fn(),
    onAlternativa: jest.fn(),
    ...sobrescritas,
  };
  return render(<EsperaAcessoRapidoNoturna {...props} />);
}

describe('HU-11 RN09 · EsperaAcessoRapidoNoturna', () => {
  beforeEach(async () => {
    buscarUsuario.mockReset();
    buscarUsuario.mockResolvedValue({ rotina: ROTINA });
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
});
