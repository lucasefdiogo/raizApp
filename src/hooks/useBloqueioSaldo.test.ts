import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBloqueioSaldo } from './useBloqueioSaldo';
import { CONFIG_BLOCO_PADRAO, estadoInicialDia } from '../domain/saldoBloqueio';
import { VisaoBloqueio } from '../native/AccessibilityDetection';

jest.mock('../native/AccessibilityDetection');
jest.mock('../services/firestore');
jest.mock('../services/crashlytics');

const native = require('../native/AccessibilityDetection');
const { registrarResumoBloqueioNoDia, buscarUsuario } = require('../services/firestore');
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
    buscarUsuario.mockResolvedValue({});
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

  describe('acesso rápido e emergência (HU-05)', () => {
    const base = (extra: Partial<VisaoBloqueio> = {}): VisaoBloqueio => ({ ...visao(), ...extra });

    it('CA-01: o hook expõe o acesso rápido disponível e a espera de 5 segundos antes de liberar', async () => {
      const v = base({ acessosRapidosRestantes: 3, msAteProximoAcessoRapido: 0 });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));
      native.obterEstadoBloqueio.mockResolvedValue(v);

      expect(result.current.acessoRapidoDisponivel).toBe(true);
      expect(result.current.esperaAcessoRapidoSeg).toBe(5);
      expect(result.current.acessosRapidosRestantes).toBe(3);
    });

    it('HU-11 RN09/Cenário 12: dentro da janela noturna, a espera do acesso rápido é de 30 segundos', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 21, 23, 41));
      buscarUsuario.mockResolvedValue({
        rotina: {
          dormirEstimado: '23:30',
          acordarEstimado: '07:00',
          confirmadoEm: '2026-10-20',
        },
      });
      const v = base({ acessosRapidosRestantes: 3, msAteProximoAcessoRapido: 0 });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      await waitFor(() => expect(result.current.esperaAcessoRapidoSeg).toBe(30));

      jest.useRealTimers();
    });

    it('HU-11 Cenário 9: sem rotina confirmada, a espera do acesso rápido continua em 5 segundos', async () => {
      buscarUsuario.mockResolvedValue({});
      const v = base({ acessosRapidosRestantes: 3, msAteProximoAcessoRapido: 0 });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      await waitFor(() => expect(buscarUsuario).toHaveBeenCalled());
      expect(result.current.esperaAcessoRapidoSeg).toBe(5);
    });

    it('CA-03: depois do 1º uso o hook expõe o tempo até o próximo acesso rápido', async () => {
      const v = base({ acessosRapidosRestantes: 2, msAteProximoAcessoRapido: 25 * 60_000 });
      native.obterEstadoBloqueio.mockResolvedValue(v);
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      expect(result.current.acessoRapidoDisponivel).toBe(false);
      expect(result.current.msAteProximoAcessoRapido).toBe(25 * 60_000);
      expect(result.current.acessosRapidosRestantes).toBe(2);
    });

    it('CA-04: com a cota esgotada o hook expõe a emergência como oferecida', async () => {
      const v = base({ acessosRapidosRestantes: 0, emergenciaOferecida: true });
      native.obterEstadoBloqueio.mockResolvedValue(v);
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      expect(result.current.acessoRapidoDisponivel).toBe(false);
      expect(result.current.emergenciaOferecida).toBe(true);
    });

    it('CA-05: concluir a emergência registra emergencias no resumo do dia', async () => {
      const esgotada = base({ acessosRapidosRestantes: 0, emergenciaOferecida: true });
      native.obterEstadoBloqueio.mockResolvedValue(esgotada);
      native.concluirEmergencia.mockResolvedValue({ aceito: true, visao: esgotada });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', esgotada));

      let aceito = false;
      await act(async () => {
        aceito = await result.current.concluirEmergencia();
      });

      expect(aceito).toBe(true);
      expect(registrarResumoBloqueioNoDia).toHaveBeenCalledWith(
        'uid-1',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        { emergencias: 1 },
      );
    });

    it('CA-05: liberar o acesso rápido aceito registra acessosRapidos; recusado não registra', async () => {
      const v = base({ acessosRapidosRestantes: 3, msAteProximoAcessoRapido: 0 });
      native.obterEstadoBloqueio.mockResolvedValue(v);
      native.liberarAcessoRapido.mockResolvedValueOnce({ aceito: false, visao: v });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      await act(async () => {
        await result.current.liberarAcessoRapido();
      });
      expect(registrarResumoBloqueioNoDia).not.toHaveBeenCalled();

      native.liberarAcessoRapido.mockResolvedValueOnce({
        aceito: true,
        visao: base({ acessosRapidosRestantes: 2, msAteProximoAcessoRapido: 25 * 60_000 }),
      });
      await act(async () => {
        await result.current.liberarAcessoRapido();
      });
      expect(registrarResumoBloqueioNoDia).toHaveBeenCalledWith(
        'uid-1',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        { acessosRapidos: 1 },
      );
      expect(result.current.acessosRapidosRestantes).toBe(2);
    });

    it('CA-06: com acesso rápido disponível o hook não expõe a emergência', async () => {
      const v = base({ acessosRapidosRestantes: 3, msAteProximoAcessoRapido: 0 });
      native.obterEstadoBloqueio.mockResolvedValue(v);
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      expect(result.current.acessoRapidoDisponivel).toBe(true);
      expect(result.current.emergenciaOferecida).toBe(false);
    });

    it('CA-06: visão sem campos novos vale 3 restantes, próximo em 0 e sem emergência', async () => {
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', visao()));

      expect(result.current.acessosRapidosRestantes).toBe(3);
      expect(result.current.msAteProximoAcessoRapido).toBe(0);
      expect(result.current.emergenciaOferecida).toBe(false);
    });

    it('CA-07: concluir a emergência não muda a cota exposta do acesso rápido', async () => {
      const esgotada = base({ acessosRapidosRestantes: 0, emergenciaOferecida: true });
      native.obterEstadoBloqueio.mockResolvedValue(esgotada);
      native.concluirEmergencia.mockResolvedValue({ aceito: true, visao: esgotada });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', esgotada));

      await act(async () => {
        await result.current.concluirEmergencia();
      });

      expect(result.current.acessosRapidosRestantes).toBe(0);
      expect(registrarResumoBloqueioNoDia).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ acessosRapidos: expect.anything() }),
      );
    });

    it('CA-05: emergência recusada pelo nativo não registra o resumo', async () => {
      const v = base({ acessosRapidosRestantes: 3 });
      native.obterEstadoBloqueio.mockResolvedValue(v);
      native.concluirEmergencia.mockResolvedValue({ aceito: false, visao: v });
      const { result } = await renderHook(() => useBloqueioSaldo('uid-1', v));

      let aceito = true;
      await act(async () => {
        aceito = await result.current.concluirEmergencia();
      });

      expect(aceito).toBe(false);
      expect(registrarResumoBloqueioNoDia).not.toHaveBeenCalled();
    });
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
