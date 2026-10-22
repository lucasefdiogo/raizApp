import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePausaNoturna } from './usePausaNoturna';
import { MENSAGENS_NOTURNAS } from '../domain/mensagensNoturnas';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');

const { buscarUsuario } = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');

const CHAVE = 'rootora.mensagemNoturna.indice';

const ROTINA = {
  dormirEstimado: '23:00',
  acordarEstimado: '07:00',
  modoManual: false,
  confirmadoEm: '2026-10-20',
};

// 23:30 local: inside the window (22:30 to 07:00).
const DENTRO = new Date(2026, 9, 21, 23, 30, 0);
// 14:00 local: outside the window.
const FORA = new Date(2026, 9, 21, 14, 0, 0);

async function montar(blocos: number) {
  const hook = await renderHook(() => usePausaNoturna('uid-1', blocos));
  await waitFor(() => expect(hook.result.current.carregando).toBe(false));
  return hook;
}

describe('usePausaNoturna', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    buscarUsuario.mockReset();
    await AsyncStorage.clear();
    // Fake only Date: fake timers would stall RNTL's waitFor.
    jest.useFakeTimers({
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
    jest.setSystemTime(DENTRO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('CA-04: dentro da janela devolve 40 s na 2ª sessão e uma mensagem noturna', async () => {
    buscarUsuario.mockResolvedValue({ rotina: ROTINA });

    const { result } = await montar(1);

    expect(result.current.noturna).toBe(true);
    expect(result.current.duracaoSeg).toBe(40);
    expect(MENSAGENS_NOTURNAS).toContain(result.current.mensagem);
  });

  it('CA-04: enquanto carrega devolve carregando true e noturna false', async () => {
    buscarUsuario.mockReturnValue(new Promise(() => {}));

    const { result, unmount } = await renderHook(() =>
      usePausaNoturna('uid-1', 1),
    );

    expect(result.current.carregando).toBe(true);
    expect(result.current.noturna).toBe(false);
    await unmount();
  });

  it('CA-05: duas aberturas seguidas devolvem mensagens diferentes', async () => {
    buscarUsuario.mockResolvedValue({ rotina: ROTINA });

    const primeira = await montar(0);
    const msg1 = primeira.result.current.mensagem;
    await primeira.unmount();
    const segunda = await montar(0);

    expect(msg1).not.toBeNull();
    expect(segunda.result.current.mensagem).not.toBeNull();
    expect(segunda.result.current.mensagem).not.toBe(msg1);
    expect(await AsyncStorage.getItem(CHAVE)).not.toBeNull();
  });

  it('CA-03: com alternativa cadastrada devolve o texto dela', async () => {
    buscarUsuario.mockResolvedValue({
      rotina: { ...ROTINA, alternativaNoturna: '  Ler um capítulo  ' },
    });

    const { result } = await montar(0);

    expect(result.current.alternativa).toBe('Ler um capítulo');
  });

  it('CA-03: dentro da janela sem alternativa devolve alternativa nula', async () => {
    buscarUsuario.mockResolvedValue({ rotina: ROTINA });

    const { result } = await montar(0);

    expect(result.current.noturna).toBe(true);
    expect(result.current.alternativa).toBeNull();
  });

  it('CA-06: sem confirmadoEm devolve a pausa padrão, sem mensagem nem alternativa', async () => {
    buscarUsuario.mockResolvedValue({
      rotina: { ...ROTINA, confirmadoEm: undefined, alternativaNoturna: 'Ler' },
    });

    const { result } = await montar(1);

    expect(result.current).toEqual({
      carregando: false,
      noturna: false,
      duracaoSeg: 20,
      mensagem: null,
      alternativa: null,
    });
    expect(await AsyncStorage.getItem(CHAVE)).toBeFalsy();
  });

  it('CA-06: fora da janela devolve a pausa padrão e não grava o índice', async () => {
    jest.setSystemTime(FORA);
    buscarUsuario.mockResolvedValue({
      rotina: { ...ROTINA, alternativaNoturna: 'Ler' },
    });

    const { result } = await montar(1);

    expect(result.current.noturna).toBe(false);
    expect(result.current.duracaoSeg).toBe(20);
    expect(result.current.mensagem).toBeNull();
    expect(result.current.alternativa).toBeNull();
    expect(await AsyncStorage.getItem(CHAVE)).toBeFalsy();
  });

  it('CA-06: falha na leitura registra o erro e cai na pausa padrão', async () => {
    buscarUsuario.mockRejectedValue(new Error('offline'));

    const { result } = await montar(1);

    expect(registrarErro).toHaveBeenCalled();
    expect(result.current.noturna).toBe(false);
    expect(result.current.duracaoSeg).toBe(20);
    expect(result.current.mensagem).toBeNull();
  });
});
