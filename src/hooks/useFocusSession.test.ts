import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFocusSession } from './useFocusSession';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('../services/analytics');
jest.mock('../native/AccessibilityDetection');

const { buscarDailyLog, registrarSessaoFocoNoDia } = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');
const { logFocusSessionEnd } = require('../services/analytics');
const {
  salvarSessaoAtiva,
  limparSessaoAtiva,
} = require('../native/AccessibilityDetection');

/**
 * Mesmo racional do timer recursivo de AppBlockedScreen.test.tsx: cada
 * próximo setTimeout só é agendado depois que o efeito do tick anterior
 * roda, então avança 1s por vez, cada um no seu próprio act().
 */
async function avancarSegundos(segundos: number) {
  for (let i = 0; i < segundos; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('useFocusSession', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    buscarDailyLog.mockResolvedValue(null);
    registrarSessaoFocoNoDia.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('conta regressivamente a partir da duração inicial até chegar em concluida', async () => {
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 3,
        tarefaId: null,
        origem: 'travado',
        estadoTravado: 'tedio',
      }),
    );

    expect(result.current.fase).toBe('contando');
    expect(result.current.segundosRestantes).toBe(3);

    await avancarSegundos(3);

    expect(result.current.fase).toBe('concluida');
    expect(result.current.segundosRestantes).toBe(0);
  });

  it('podeMarcarComoFeita reflete se há tarefaId', async () => {
    const { result: comTarefa } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: 'tarefa-1',
        origem: 'travado',
        estadoTravado: 'confusao',
      }),
    );
    expect(comTarefa.current.podeMarcarComoFeita).toBe(true);

    const { result: semTarefa } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: null,
        origem: 'travado',
        estadoTravado: 'tedio',
      }),
    );
    expect(semTarefa.current.podeMarcarComoFeita).toBe(false);
  });

  it('pararAqui registra a sessão com resultado "parou" e loga o evento', async () => {
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 300,
        tarefaId: 'tarefa-1',
        origem: 'travado',
        estadoTravado: 'medo',
      }),
    );

    await act(async () => {
      result.current.pararAqui();
    });

    expect(logFocusSessionEnd).toHaveBeenCalledWith(300, 'parou');
    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalled());
    const [uidChamado, dataChamada, sessoes] =
      registrarSessaoFocoNoDia.mock.calls[0];
    expect(uidChamado).toBe('uid-1');
    expect(dataChamada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sessoes).toEqual([
      expect.objectContaining({
        tarefaId: 'tarefa-1',
        origem: 'travado',
        estadoTravado: 'medo',
        duracaoPlanejadaSeg: 300,
        duracaoRealSeg: 300,
        resultado: 'parou',
      }),
    ]);
  });

  it('acrescenta à lista de sessões já existente no dia, sem sobrescrever', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-24',
      tarefas: [],
      statusDia: 'pendente',
      escudoUsado: false,
      sessoesFoco: [
        {
          id: 'anterior',
          tarefaId: null,
          origem: 'home',
          estadoTravado: null,
          duracaoPlanejadaSeg: 60,
          duracaoRealSeg: 60,
          resultado: 'parou',
          criadoEm: '2026-09-24T08:00:00.000Z',
        },
      ],
    });

    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: null,
        origem: 'travado',
        estadoTravado: 'confusao',
      }),
    );

    await act(async () => {
      result.current.pararAqui();
    });

    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalled());
    const [, , sessoes] = registrarSessaoFocoNoDia.mock.calls[0];
    expect(sessoes).toHaveLength(2);
    expect(sessoes[0].id).toBe('anterior');
  });

  it('marcarTarefaComoFeita registra "concluiu_tarefa" e chama onTarefaConcluida', async () => {
    const onTarefaConcluida = jest.fn();
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: 'tarefa-1',
        origem: 'travado',
        estadoTravado: 'confusao',
        onTarefaConcluida,
      }),
    );

    await act(async () => {
      result.current.marcarTarefaComoFeita();
    });

    expect(onTarefaConcluida).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalled());
    const [, , sessoes] = registrarSessaoFocoNoDia.mock.calls[0];
    expect(sessoes[0].resultado).toBe('concluiu_tarefa');
  });

  it('continuarMais10Minutos registra "continuou", reseta pra 10 minutos e volta a contar', async () => {
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: null,
        origem: 'travado',
        estadoTravado: 'confusao',
      }),
    );

    await act(async () => {
      result.current.continuarMais10Minutos();
    });

    expect(result.current.fase).toBe('contando');
    expect(result.current.duracaoPlanejadaSeg).toBe(600);
    expect(result.current.segundosRestantes).toBe(600);
    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalled());
    const [, , sessoes] = registrarSessaoFocoNoDia.mock.calls[0];
    expect(sessoes[0]).toMatchObject({
      duracaoPlanejadaSeg: 120,
      resultado: 'continuou',
    });
  });

  it('liberarApp registra a sessão com resultado "liberou_app"', async () => {
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: 'tarefa-1',
        origem: 'interceptacao',
        estadoTravado: null,
      }),
    );

    await act(async () => {
      result.current.liberarApp();
    });

    expect(logFocusSessionEnd).toHaveBeenCalledWith(120, 'liberou_app');
    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalled());
    const [, , sessoes] = registrarSessaoFocoNoDia.mock.calls[0];
    expect(sessoes[0]).toMatchObject({
      origem: 'interceptacao',
      resultado: 'liberou_app',
    });
  });

  it('não duplica o registro em toque duplo na mesma ação', async () => {
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: null,
        origem: 'travado',
        estadoTravado: 'tedio',
      }),
    );

    await act(async () => {
      result.current.pararAqui();
      result.current.pararAqui();
    });

    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalledTimes(1));
  });

  it('falha ao gravar: não quebra, só registra o erro', async () => {
    registrarSessaoFocoNoDia.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1',
        duracaoInicialSeg: 120,
        tarefaId: null,
        origem: 'travado',
        estadoTravado: 'tedio',
      }),
    );

    await act(async () => {
      result.current.pararAqui();
    });

    await waitFor(() =>
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useFocusSession.registrar',
      ),
    );
  });

  describe('sessão ativa (Etapa 4 — reabrir a interceptação com o timer em andamento)', () => {
    it('sem packageName: nunca chama salvarSessaoAtiva/limparSessaoAtiva', async () => {
      await renderHook(() =>
        useFocusSession({
          uid: 'uid-1',
          duracaoInicialSeg: 120,
          tarefaId: null,
          origem: 'travado',
          estadoTravado: 'tedio',
        }),
      );

      await avancarSegundos(1);
      expect(salvarSessaoAtiva).not.toHaveBeenCalled();
      expect(limparSessaoAtiva).not.toHaveBeenCalled();
    });

    it('com packageName: marca a sessão ativa ao entrar em contando, com fimEm calculado a partir da duração planejada', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await renderHook(() =>
        useFocusSession({
          uid: 'uid-1',
          duracaoInicialSeg: 120,
          tarefaId: 'tarefa-1',
          origem: 'interceptacao',
          estadoTravado: null,
          packageName: 'com.instagram.android',
        }),
      );

      expect(salvarSessaoAtiva).toHaveBeenCalledWith({
        packageName: 'com.instagram.android',
        tarefaId: 'tarefa-1',
        estadoTravado: null,
        fimEm: 1_000_000 + 120 * 1000,
      });
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('não marca de novo a cada segundo — só quando a perna do timer muda', async () => {
      await renderHook(() =>
        useFocusSession({
          uid: 'uid-1',
          duracaoInicialSeg: 3,
          tarefaId: null,
          origem: 'interceptacao',
          estadoTravado: null,
          packageName: 'com.instagram.android',
        }),
      );
      salvarSessaoAtiva.mockClear();

      await avancarSegundos(2);

      expect(salvarSessaoAtiva).not.toHaveBeenCalled();
    });

    it('limpa a sessão ativa quando o timer chega a zero (fase concluida)', async () => {
      const { result } = await renderHook(() =>
        useFocusSession({
          uid: 'uid-1',
          duracaoInicialSeg: 2,
          tarefaId: null,
          origem: 'interceptacao',
          estadoTravado: null,
          packageName: 'com.instagram.android',
        }),
      );

      await avancarSegundos(2);

      expect(result.current.fase).toBe('concluida');
      expect(limparSessaoAtiva).toHaveBeenCalled();
    });

    it('continuarMais10Minutos re-marca a sessão ativa com os novos 10 minutos', async () => {
      const { result } = await renderHook(() =>
        useFocusSession({
          uid: 'uid-1',
          duracaoInicialSeg: 120,
          tarefaId: 'tarefa-1',
          origem: 'interceptacao',
          estadoTravado: null,
          packageName: 'com.instagram.android',
        }),
      );

      await act(async () => {
        result.current.continuarMais10Minutos();
      });

      const ultimaChamada =
        salvarSessaoAtiva.mock.calls[salvarSessaoAtiva.mock.calls.length - 1][0];
      expect(ultimaChamada.fimEm - Date.now()).toBeCloseTo(600 * 1000, -2);
    });

    it('limpa no unmount, mesmo sem nenhuma ação de FimSessao ter sido tomada', async () => {
      const { unmount } = await renderHook(() =>
        useFocusSession({
          uid: 'uid-1',
          duracaoInicialSeg: 120,
          tarefaId: null,
          origem: 'interceptacao',
          estadoTravado: null,
          packageName: 'com.instagram.android',
        }),
      );
      limparSessaoAtiva.mockClear();

      await act(async () => {
        unmount();
      });

      expect(limparSessaoAtiva).toHaveBeenCalled();
    });
  });
});
