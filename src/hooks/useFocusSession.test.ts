import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFocusSession } from './useFocusSession';
import { AppState } from 'react-native';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('../services/analytics');
jest.mock('../native/AccessibilityDetection');

const { registrarSessaoFocoNoDia } = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');
const { logFocusSessionEnd } = require('../services/analytics');
const {
  salvarSessaoAtiva,
  limparSessaoAtiva,
  iniciarMomentoFoco,
  consultarMomentoFoco,
  encerrarMomentoFoco,
  consumirEncerramentoFocoExterno,
} = require('../native/AccessibilityDetection');

/**
 * O timer usa setTimeout recursivo — cada próximo só é agendado depois que
 * o efeito do tick anterior roda — então avança 1s por vez, cada um no seu
 * próprio act().
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
    registrarSessaoFocoNoDia.mockResolvedValue(undefined);
    iniciarMomentoFoco.mockResolvedValue(true);
    consultarMomentoFoco.mockResolvedValue(true);
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

  it('ativa e encerra o bloqueio temporário junto com a contagem da tarefa', async () => {
    const { result, unmount } = await renderHook(() =>
      useFocusSession({
        uid: 'uid-1', duracaoInicialSeg: 2, tarefaId: 'tarefa-1',
        origem: 'home', estadoTravado: null, bloquearAppsSelecionados: true,
      }),
    );
    expect(iniciarMomentoFoco).toHaveBeenCalledWith(expect.any(Number));
    await avancarSegundos(2);
    expect(result.current.fase).toBe('concluida');
    expect(encerrarMomentoFoco).toHaveBeenCalled();
    unmount();
  });

  it('uma ativação atrasada da etapa anterior não encerra a continuação', async () => {
    let concluirPrimeiraAtivacao: (ativo: boolean) => void = () => undefined;
    iniciarMomentoFoco.mockImplementationOnce(() => new Promise<boolean>(resolve => {
      concluirPrimeiraAtivacao = resolve;
    }));
    const { result } = await renderHook(() =>
      useFocusSession({ uid: 'uid-1', duracaoInicialSeg: 2, tarefaId: 'tarefa-1',
        origem: 'home', estadoTravado: null, bloquearAppsSelecionados: true }),
    );
    await avancarSegundos(2);
    await act(async () => result.current.continuarMais10Minutos());
    expect(iniciarMomentoFoco).toHaveBeenCalledTimes(2);
    encerrarMomentoFoco.mockClear();
    await act(async () => concluirPrimeiraAtivacao(true));
    expect(encerrarMomentoFoco).not.toHaveBeenCalled();
  });

  it('registra apenas o tempo decorrido quando a pessoa para antes do prazo', async () => {
    const { result } = await renderHook(() =>
      useFocusSession({ uid: 'uid-1', duracaoInicialSeg: 300, tarefaId: 'tarefa-1',
        origem: 'home', estadoTravado: null }),
    );
    await avancarSegundos(3);
    await act(async () => result.current.pararAqui());
    await waitFor(() => expect(registrarSessaoFocoNoDia).toHaveBeenCalled());
    expect(registrarSessaoFocoNoDia.mock.calls[0][2].duracaoRealSeg).toBe(3);
  });

  it('reconhece a saída pela interceptação ao voltar para o Rootora', async () => {
    let aoMudarEstado: ((estado: string) => void) | undefined;
    const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
      aoMudarEstado = callback as (estado: string) => void;
      return { remove: jest.fn() };
    });
    consumirEncerramentoFocoExterno.mockResolvedValue(Date.now());
    const { result } = await renderHook(() =>
      useFocusSession({ uid: 'uid-1', duracaoInicialSeg: 300, tarefaId: 'tarefa-1',
        origem: 'home', estadoTravado: null, bloquearAppsSelecionados: true }),
    );
    await act(async () => { aoMudarEstado?.('active'); });
    await waitFor(() => expect(result.current.encerradoExternamente).toBe(true));
    listener.mockRestore();
  });

  it('registra o instante em que a sessão foi encerrada na interceptação', async () => {
    let aoMudarEstado: ((estado: string) => void) | undefined;
    const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
      aoMudarEstado = callback as (estado: string) => void;
      return { remove: jest.fn() };
    });
    const inicio = Date.now();
    consumirEncerramentoFocoExterno.mockResolvedValue(inicio + 60000);
    const { result } = await renderHook(() => useFocusSession({
      uid: 'uid-1', duracaoInicialSeg: 300, tarefaId: 'tarefa-1',
      origem: 'home', estadoTravado: null, bloquearAppsSelecionados: true,
    }));
    jest.setSystemTime(inicio + 240000);
    await act(async () => { aoMudarEstado?.('active'); });
    await act(async () => result.current.pararAqui());
    expect(registrarSessaoFocoNoDia.mock.calls[0][2].duracaoRealSeg).toBe(60);
    listener.mockRestore();
  });

  it('reconhece encerramento externo mesmo após o prazo ter expirado', async () => {
    let aoMudarEstado: ((estado: string) => void) | undefined;
    const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
      aoMudarEstado = callback as (estado: string) => void;
      return { remove: () => { aoMudarEstado = undefined; } };
    });
    const inicio = Date.now();
    consumirEncerramentoFocoExterno.mockResolvedValue(inicio + 1000);
    const { result } = await renderHook(() => useFocusSession({
      uid: 'uid-1', duracaoInicialSeg: 3, tarefaId: 'tarefa-1',
      origem: 'home', estadoTravado: null, bloquearAppsSelecionados: true,
    }));
    await avancarSegundos(3);
    await act(async () => { aoMudarEstado?.('active'); });
    expect(result.current.encerradoExternamente).toBe(true);
    await act(async () => result.current.pararAqui());
    expect(registrarSessaoFocoNoDia.mock.calls[0][2].duracaoRealSeg).toBe(1);
    listener.mockRestore();
  });

  it('retira a promessa de bloqueio se a Acessibilidade foi desligada durante o foco', async () => {
    let aoMudarEstado: ((estado: string) => void) | undefined;
    const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
      aoMudarEstado = callback as (estado: string) => void;
      return { remove: jest.fn() };
    });
    consumirEncerramentoFocoExterno.mockResolvedValue(0);
    consultarMomentoFoco.mockResolvedValue(false);
    const { result } = await renderHook(() =>
      useFocusSession({ uid: 'uid-1', duracaoInicialSeg: 300, tarefaId: 'tarefa-1',
        origem: 'home', estadoTravado: null, bloquearAppsSelecionados: true }),
    );
    await waitFor(() => expect(result.current.bloqueioAtivo).toBe(true));
    await act(async () => { aoMudarEstado?.('active'); });
    await waitFor(() => expect(result.current.bloqueioAtivo).toBe(false));
    listener.mockRestore();
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
    const [uidChamado, dataChamada, sessao] =
      registrarSessaoFocoNoDia.mock.calls[0];
    expect(uidChamado).toBe('uid-1');
    expect(dataChamada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sessao).toMatchObject({
      tarefaId: 'tarefa-1',
      origem: 'travado',
      estadoTravado: 'medo',
      duracaoPlanejadaSeg: 300,
      duracaoRealSeg: 0,
      resultado: 'parou',
    });
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
    const [, , sessao] = registrarSessaoFocoNoDia.mock.calls[0];
    expect(sessao.resultado).toBe('concluiu_tarefa');
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
    const [, , sessao] = registrarSessaoFocoNoDia.mock.calls[0];
    expect(sessao).toMatchObject({
      duracaoPlanejadaSeg: 120,
      resultado: 'continuou',
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
