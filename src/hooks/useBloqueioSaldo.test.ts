import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBloqueioSaldo } from './useBloqueioSaldo';
import { CONFIG_BLOCO_PADRAO, estadoInicialSaldo } from '../domain/saldoBloqueio';
import { VisaoBloqueio } from '../native/AccessibilityDetection';

jest.mock('../native/AccessibilityDetection');
jest.mock('../services/firestore');
jest.mock('../services/crashlytics');

const native = require('../native/AccessibilityDetection');
const { registrarResumoBloqueioNoDia } = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');

function visao(sobrescrita: Partial<VisaoBloqueio['estado']> = {}): VisaoBloqueio {
  return {
    estado: {
      ...estadoInicialSaldo('2026-10-11'),
      fase: 'AGUARDANDO_LIBERACAO',
      saldo: 4,
      ...sobrescrita,
    },
    config: CONFIG_BLOCO_PADRAO,
    agora: 1_700_000_000_000,
  };
}

describe('useBloqueioSaldo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    native.obterEstadoBloqueio.mockResolvedValue(visao());
    registrarResumoBloqueioNoDia.mockResolvedValue(undefined);
  });

  it('começa na visão inicial e a duração da pausa vem de blocosUsados', async () => {
    native.obterEstadoBloqueio.mockResolvedValue(visao({ blocosUsados: 2 }));
    const { result } = await renderHook(() =>
      useBloqueioSaldo('uid-1', visao({ blocosUsados: 2 })),
    );

    expect(result.current.pausaIntencaoSeg).toBe(20);
    expect(result.current.visao?.estado.fase).toBe('AGUARDANDO_LIBERACAO');
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
      { blocosUsados: 1, intencao: 'ver mensagens' },
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

  it('aceitarTolerancia grava toleranciasUsadas; recusar não grava nada', async () => {
    native.obterEstadoBloqueio.mockResolvedValue(visao({ fase: 'TOLERANCIA' }));
    native.usarTolerancia.mockResolvedValue(true);
    native.recusarTolerancia.mockResolvedValue(true);
    const { result } = await renderHook(() =>
      useBloqueioSaldo('uid-1', visao({ fase: 'TOLERANCIA' })),
    );

    expect(result.current.podeTolerancia).toBe(true);

    await act(async () => {
      await result.current.recusarTolerancia();
    });
    expect(registrarResumoBloqueioNoDia).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.aceitarTolerancia();
    });
    expect(registrarResumoBloqueioNoDia).toHaveBeenCalledWith(
      'uid-1',
      expect.any(String),
      { toleranciasUsadas: 1 },
    );
  });

  it('podeTolerancia é false depois de usada', async () => {
    const usada = visao({ fase: 'TOLERANCIA', toleranciaUsada: true });
    native.obterEstadoBloqueio.mockResolvedValue(usada);
    const { result } = await renderHook(() => useBloqueioSaldo('uid-1', usada));

    expect(result.current.podeTolerancia).toBe(false);
  });

  describe('polling', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

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
