import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBloqueioSaldo } from './useBloqueioSaldo';
import { CONFIG_BLOCO_PADRAO, estadoInicialDia } from '../domain/saldoBloqueio';
import { VisaoBloqueio } from '../native/AccessibilityDetection';

jest.mock('../native/AccessibilityDetection');
jest.mock('../services/firestore');
jest.mock('../services/crashlytics');

const native = require('../native/AccessibilityDetection');
const { registrarResumoBloqueioNoDia } = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');

function visao(
  sobrescrita: Partial<VisaoBloqueio['estado']> = {},
  config: Partial<VisaoBloqueio['config']> = {},
): VisaoBloqueio {
  return {
    estado: {
      ...estadoInicialDia('2026-10-11'),
      ...sobrescrita,
    },
    config: { ...CONFIG_BLOCO_PADRAO, ...config },
    agora: 1_700_000_000_000,
  };
}

describe('useBloqueioSaldo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    native.obterEstadoBloqueio.mockResolvedValue(visao());
    registrarResumoBloqueioNoDia.mockResolvedValue(undefined);
  });

  it('CA-01: a primeira liberação do dia expõe pausa de 10 segundos', async () => {
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', visao()));

    expect(result.current.pausaIntencaoSeg).toBe(10);
    expect(result.current.podeLiberar).toBe(true);
    expect(result.current.visao?.estado.fase).toBe('AGUARDANDO_LIBERACAO');
  });

  it('CA-04: depois de uma sessão liberada o hook expõe pausa de 20 segundos', async () => {
    const v = visao({ blocosUsados: 1, fase: 'AGUARDANDO_LIBERACAO' });
    native.obterEstadoBloqueio.mockResolvedValue(v);
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

    expect(result.current.pausaIntencaoSeg).toBe(20);
  });

  it('CA-06: em SALDO_ZERADO o hook não expõe pausa de intenção', async () => {
    const v = visao({ blocosUsados: 2, fase: 'SALDO_ZERADO' }, { blocosDiarios: 2 });
    native.obterEstadoBloqueio.mockResolvedValue(v);
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

    expect(result.current.podeLiberar).toBe(false);
    expect(result.current.visao?.estado.fase).toBe('SALDO_ZERADO');
  });

  it('expõe tempo restante da sessão ativa e o aviso de 1 minuto', async () => {
    const agora = Date.now();
    const v = visao({ fase: 'SESSAO_ATIVA', blocosUsados: 1, consumidoMs: 14 * 60_000 + 10_000 });
    native.obterEstadoBloqueio.mockResolvedValue({ ...v, agora });
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

    expect(result.current.msRestantesSessao).toBe(50_000);
    expect(result.current.avisoUmMinuto).toBe(true);
    expect(result.current.msRestantesCooldown).toBe(0);
  });

  it('sem visão inicial: carrega do nativo', async () => {
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', null));

    await waitFor(() => expect(result.current.visao).not.toBeNull());
    expect(native.obterEstadoBloqueio).toHaveBeenCalled();
  });

  it('liberar: abre o bloco e grava o resumo com a intenção (trim)', async () => {
    native.liberarBloco.mockResolvedValue(true);
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', visao()));

    let ok = false;
    await act(async () => {
      ok = await result.current.liberar('  ver mensagens  ');
    });

    expect(ok).toBe(true);
    expect(registrarResumoBloqueioNoDia).toHaveBeenCalledWith(
      'uid-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      { sessoesUsadas: 1, intencao: 'ver mensagens' },
    );
  });

  it('liberar sem sucesso no nativo: não grava resumo', async () => {
    native.liberarBloco.mockResolvedValue(false);
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', visao()));

    await act(async () => {
      await result.current.liberar('x');
    });

    expect(registrarResumoBloqueioNoDia).not.toHaveBeenCalled();
  });

  it('falha ao gravar o resumo vai pro Crashlytics e não derruba o liberar', async () => {
    native.liberarBloco.mockResolvedValue(true);
    registrarResumoBloqueioNoDia.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', visao()));

    let ok = false;
    await act(async () => {
      ok = await result.current.liberar('');
    });

    expect(ok).toBe(true);
    await waitFor(() => expect(registrarErro).toHaveBeenCalled());
  });

  describe('polling', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('CA-03: o hook expõe o tempo restante do cooldown e ele diminui a cada segundo', async () => {
      const agora = Date.now();
      const cd = visao({ fase: 'COOLDOWN', blocosUsados: 1, fimCooldownEm: agora + 45 * 60_000 });
      native.obterEstadoBloqueio.mockResolvedValue(cd);
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', cd));

      const antes = result.current.msRestantesCooldown;
      expect(antes).toBeGreaterThan(44 * 60_000);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.msRestantesCooldown).toBeLessThan(antes);
    });

    it('CA-07: o hook volta a AGUARDANDO_LIBERACAO quando o nativo credita uma extra', async () => {
      const zerado = visao({ fase: 'SALDO_ZERADO', blocosUsados: 2 }, { blocosDiarios: 2 });
      native.obterEstadoBloqueio.mockResolvedValue(zerado);
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', zerado));
      expect(result.current.podeLiberar).toBe(false);

      native.obterEstadoBloqueio.mockResolvedValue(
        visao({ fase: 'AGUARDANDO_LIBERACAO', blocosUsados: 2, saldo: 1 }, { blocosDiarios: 2 }),
      );
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.visao?.estado.fase).toBe('AGUARDANDO_LIBERACAO');
      expect(result.current.podeLiberar).toBe(true);
    });

    it('em COOLDOWN relê o nativo a cada segundo; em AGUARDANDO_LIBERACAO não', async () => {
      const cooldown = visao({ fase: 'COOLDOWN', fimCooldownEm: 1_700_000_900_000 });
      native.obterEstadoBloqueio.mockResolvedValue(cooldown);
      const primeiro = await renderHook(() =>
        useBloqueioSaldo('uid-1', cooldown),
      );
      const chamadasAoMontar = native.obterEstadoBloqueio.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(native.obterEstadoBloqueio.mock.calls.length).toBeGreaterThan(
        chamadasAoMontar,
      );

      await primeiro.unmount();
      native.obterEstadoBloqueio.mockClear();
      native.obterEstadoBloqueio.mockResolvedValue(visao());
      await renderHook(() => useBloqueioSaldo('uid-1', visao()));
      const aoMontarAguardando = native.obterEstadoBloqueio.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(native.obterEstadoBloqueio.mock.calls.length).toBe(aoMontarAguardando);
    });
  });
});
