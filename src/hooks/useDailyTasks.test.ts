import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDailyTasks } from './useDailyTasks';

jest.mock('../services/firestore');
jest.mock('../services/analytics');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const {
  buscarDailyLog,
  existeAlgumDailyLog,
  salvarDailyLog,
  garantirDailyLogDoDia,
  buscarTarefasRecorrentesAtivas,
  criarTarefaRecorrente,
  desativarTarefaRecorrente,
} = require('../services/firestore');
const { logTarefaCriada, logTarefaConcluida } = require('../services/analytics');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

const showToast = jest.fn();

const MSG_FALHA_ALTERACAO = 'Não conseguimos salvar sua alteração. Tente de novo.';
const MSG_FALHA_ADICIONAR =
  'Não conseguimos adicionar a tarefa agora. Tente de novo.';
const MSG_FALHA_RECARREGAR = 'Não conseguimos atualizar agora. Tente de novo.';

describe('useDailyTasks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    salvarDailyLog.mockResolvedValue(undefined);
    garantirDailyLogDoDia.mockResolvedValue(undefined);
    existeAlgumDailyLog.mockResolvedValue(false);
    buscarTarefasRecorrentesAtivas.mockResolvedValue([]);
    criarTarefaRecorrente.mockResolvedValue('recorrente-1');
    desativarTarefaRecorrente.mockResolvedValue(undefined);
    useToast.mockReturnValue({ showToast });
  });

  it('primeiro dia de uso (nenhum dailyLog): semeia as tarefas de exemplo localmente, mas grava o dia real vazio via garantirDailyLogDoDia', async () => {
    buscarDailyLog.mockResolvedValue(null);
    existeAlgumDailyLog.mockResolvedValue(false);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toHaveLength(3);
    expect(result.current.tarefas.every(t => !t.concluida)).toBe(true);
    // TAREFAS_EXEMPLO é só demonstração local — o dailyLog gravado não leva
    // o exemplo, só o que existe de fato em essentialTasks (nada, aqui).
    expect(salvarDailyLog).not.toHaveBeenCalled();
    expect(garantirDailyLogDoDia).toHaveBeenCalledTimes(1);
    const [uidChamado, dataChamada, tarefasIniciais] =
      garantirDailyLogDoDia.mock.calls[0];
    expect(uidChamado).toBe('uid-1');
    expect(dataChamada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tarefasIniciais).toEqual([]);
  });

  it('dia novo depois de já ter usado antes: começa vazio (não semeia de novo) e grava o dia real vazio', async () => {
    buscarDailyLog.mockResolvedValue(null);
    existeAlgumDailyLog.mockResolvedValue(true);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toEqual([]);
    expect(result.current.statusDia).toBe('pendente');
    expect(salvarDailyLog).not.toHaveBeenCalled();
    expect(garantirDailyLogDoDia).toHaveBeenCalledWith(
      'uid-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      [],
    );
  });

  it('com dailyLog já salvo: carrega o estado persistido em vez do padrão', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'Tarefa customizada', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tarefas).toEqual([
      { id: '1', titulo: 'Tarefa customizada', essencial: true, concluida: true },
    ]);
    expect(result.current.statusDia).toBe('cumprido');
  });

  it('alternarTarefa atualiza o estado local, grava o dia inteiro e não dispara toast', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.tarefas.find(t => t.id === '1')?.concluida).toBe(true);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();

    const [uidChamado, dataChamada, logGravado] = salvarDailyLog.mock.calls[0];
    expect(uidChamado).toBe('uid-1');
    expect(dataChamada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(logGravado.tarefas.find((t: { id: string }) => t.id === '1').concluida).toBe(
      true,
    );
    expect(logGravado.statusDia).toBe('cumprido');
    expect(logGravado.escudoUsado).toBe(false);
    expect(logTarefaConcluida).toHaveBeenCalledWith(true, 'padrao');
  });

  it('preserva escudoUsado vindo do dailyLog carregado ao gravar um toggle', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'tarefa', essencial: true, concluida: false },
      ],
      statusDia: 'nao_cumprido',
      escudoUsado: true,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(logGravado.escudoUsado).toBe(true);
  });

  it('desmarcar uma tarefa concluída volta o statusDia pra nao_cumprido/pendente conforme o resto', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'tarefa', essencial: true, concluida: true },
      ],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.statusDia).toBe('pendente');
    // Desmarcar não é "concluir" — não deve gerar o evento de conclusão.
    expect(logTarefaConcluida).not.toHaveBeenCalled();
  });

  it('adicionarTarefa insere no estado local e grava o dia inteiro', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.adicionarTarefa('Revisar o capítulo 3', false);
    });

    expect(
      result.current.tarefas.some(t => t.titulo === 'Revisar o capítulo 3'),
    ).toBe(true);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(logGravado.tarefas).toHaveLength(4);
    expect(showToast).not.toHaveBeenCalled();
    expect(logTarefaCriada).toHaveBeenCalledWith(false, 'padrao');
  });

  it('adicionarTarefa grava tipo "exercicio" e duracaoMinutos quando fornecidos', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.adicionarTarefa('Caminhada leve', false, 'exercicio', 20);
    });

    const nova = result.current.tarefas.find(t => t.titulo === 'Caminhada leve');
    expect(nova).toMatchObject({
      titulo: 'Caminhada leve',
      essencial: false,
      concluida: false,
      tipo: 'exercicio',
      duracaoMinutos: 20,
    });
    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(
      logGravado.tarefas.find(
        (t: { titulo: string }) => t.titulo === 'Caminhada leve',
      ),
    ).toMatchObject({ tipo: 'exercicio', duracaoMinutos: 20 });
    expect(logTarefaCriada).toHaveBeenCalledWith(false, 'exercicio');
  });

  it('adicionarTarefa como exercício sem duração: grava tipo, sem o campo duracaoMinutos', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.adicionarTarefa('Alongar', false, 'exercicio');
    });

    const nova = result.current.tarefas.find(t => t.titulo === 'Alongar');
    expect(nova?.tipo).toBe('exercicio');
    expect(nova).not.toHaveProperty('duracaoMinutos');
  });

  it('adicionarTarefa sem os args de exercício: retrocompatível, tarefa fica sem tipo/duração', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.adicionarTarefa('Ler 10 páginas', false);
    });

    const nova = result.current.tarefas.find(t => t.titulo === 'Ler 10 páginas');
    expect(nova).not.toHaveProperty('tipo');
    expect(nova).not.toHaveProperty('duracaoMinutos');
    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    const gravada = logGravado.tarefas.find(
      (t: { titulo: string }) => t.titulo === 'Ler 10 páginas',
    );
    expect(gravada).not.toHaveProperty('tipo');
  });

  it('adicionarTarefa essencial com 3 essenciais já no dia: dispara toast do limite e não grava', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'a', essencial: true, concluida: false },
        { id: '2', titulo: 'b', essencial: true, concluida: false },
        { id: '3', titulo: 'c', essencial: true, concluida: false },
      ],
      statusDia: 'pendente',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.limiteEssenciaisAtingido).toBe(true);

    await act(async () => {
      result.current.adicionarTarefa('Quarta essencial', true);
    });

    expect(showToast).toHaveBeenCalledWith(
      'Só dá pra marcar até 3 tarefas essenciais por dia',
    );
    expect(result.current.tarefas).toHaveLength(3);
    expect(salvarDailyLog).not.toHaveBeenCalled();
    expect(logTarefaCriada).not.toHaveBeenCalled();
  });

  it('editarTarefa renomeia e grava o dia inteiro', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.editarTarefa('1', { titulo: 'Abrir o material por 2 minutos' });
    });

    expect(result.current.tarefas.find(t => t.id === '1')?.titulo).toBe(
      'Abrir o material por 2 minutos',
    );
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
  });

  it('escrita otimista: se salvarDailyLog falha, o estado volta ao anterior e dispara toast', async () => {
    buscarDailyLog.mockResolvedValue(null);
    salvarDailyLog.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const tarefasAntes = result.current.tarefas;

    await act(async () => {
      result.current.alternarTarefa('1');
    });

    expect(result.current.tarefas).toEqual(tarefasAntes);
    expect(result.current.tarefas.find(t => t.id === '1')?.concluida).toBe(false);
    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_ALTERACAO);
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useDailyTasks.persistir',
    );
  });

  it('adicionarTarefa com falha de rede: reverte e dispara o toast de adicionar', async () => {
    buscarDailyLog.mockResolvedValue(null);
    salvarDailyLog.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const tarefasAntes = result.current.tarefas;

    await act(async () => {
      result.current.adicionarTarefa('Nova tarefa', false);
    });

    expect(result.current.tarefas).toEqual(tarefasAntes);
    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_ADICIONAR);
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useDailyTasks.persistir',
    );
  });

  it('removerTarefa tira do estado local e grava o dia inteiro sem a tarefa', async () => {
    buscarDailyLog.mockResolvedValue(null);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.removerTarefa('2');
    });

    expect(result.current.tarefas.map(t => t.id)).toEqual(['1', '3']);
    expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    const [, , logGravado] = salvarDailyLog.mock.calls[0];
    expect(logGravado.tarefas.map((t: { id: string }) => t.id)).toEqual(['1', '3']);
  });

  it('removerTarefa pode esvaziar o dia (statusDia volta a pendente)', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-15',
      tarefas: [{ id: '1', titulo: 'única', essencial: true, concluida: true }],
      statusDia: 'cumprido',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.removerTarefa('1');
    });

    expect(result.current.tarefas).toEqual([]);
    expect(result.current.statusDia).toBe('pendente');
  });

  it('recarregar() refaz a leitura do dailyLog sob demanda e reflete o novo estado, sem passar por carregando', async () => {
    buscarDailyLog.mockResolvedValueOnce(null);
    existeAlgumDailyLog.mockResolvedValue(false);

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscarDailyLog).toHaveBeenCalledTimes(1);
    expect(result.current.tarefas).toHaveLength(3); // tarefas de exemplo

    buscarDailyLog.mockResolvedValueOnce({
      data: '2026-09-15',
      tarefas: [
        { id: 'srv', titulo: 'Veio do servidor', essencial: true, concluida: false },
      ],
      statusDia: 'pendente',
      escudoUsado: false,
    });

    await act(async () => {
      await result.current.recarregar();
    });

    expect(buscarDailyLog).toHaveBeenCalledTimes(2);
    expect(result.current.carregando).toBe(false);
    expect(result.current.tarefas).toEqual([
      { id: 'srv', titulo: 'Veio do servidor', essencial: true, concluida: false },
    ]);
    expect(showToast).not.toHaveBeenCalled();
  });

  describe('tarefas recorrentes', () => {
    it('dia novo com recorrentes ativas: pré-popula tarefas[] a partir delas e grava o mesmo conteúdo via garantirDailyLogDoDia', async () => {
      buscarDailyLog.mockResolvedValue(null);
      existeAlgumDailyLog.mockResolvedValue(true);
      buscarTarefasRecorrentesAtivas.mockResolvedValue([
        { id: 'rec-1', titulo: 'Ler 5 páginas', essencial: true, ativa: true },
        { id: 'rec-2', titulo: 'Beber água', essencial: false, ativa: true },
      ]);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.tarefas).toHaveLength(2);
      expect(result.current.tarefas.every(t => !t.concluida)).toBe(true);
      expect(
        result.current.tarefas.map(t => [t.titulo, t.origemRecorrenteId]),
      ).toEqual([
        ['Ler 5 páginas', 'rec-1'],
        ['Beber água', 'rec-2'],
      ]);
      expect(salvarDailyLog).not.toHaveBeenCalled();
      expect(garantirDailyLogDoDia).toHaveBeenCalledTimes(1);
      const [, , tarefasIniciais] = garantirDailyLogDoDia.mock.calls[0];
      expect(
        tarefasIniciais.map((t: { titulo: string }) => t.titulo),
      ).toEqual(['Ler 5 páginas', 'Beber água']);
    });

    it('regressão: recorrente concluída ontem aparece concluida:false hoje, com um id novo — mesmo sem o app ter reiniciado (hojeISO não pode "congelar" no dia do mount)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00Z'));

      buscarTarefasRecorrentesAtivas.mockResolvedValue([
        { id: 'rec-1', titulo: 'Ler 5 páginas', essencial: true, ativa: true },
      ]);

      // Dia 1: sem dailyLog ainda — pré-popula a partir da recorrente.
      const logsSalvos: Record<string, unknown> = {};
      buscarDailyLog.mockImplementation((_uid: string, data: string) =>
        Promise.resolve(logsSalvos[data] ?? null),
      );
      existeAlgumDailyLog.mockResolvedValue(true);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      const idDia1 = result.current.tarefas[0].id;
      expect(result.current.tarefas[0].concluida).toBe(false);

      // Usuário conclui a recorrente ainda no dia 1 — persistir grava
      // concluida:true no dailyLog de 2026-09-15.
      await act(async () => {
        result.current.alternarTarefa(idDia1);
      });
      expect(salvarDailyLog).toHaveBeenCalledWith(
        'uid-1',
        '2026-09-15',
        expect.objectContaining({
          tarefas: [expect.objectContaining({ id: idDia1, concluida: true })],
        }),
      );
      logsSalvos['2026-09-15'] = {
        data: '2026-09-15',
        tarefas: [{ id: idDia1, titulo: 'Ler 5 páginas', essencial: true, concluida: true, origemRecorrenteId: 'rec-1' }],
        statusDia: 'cumprido',
        escudoUsado: false,
      };

      // O app nunca é fechado — só passa a meia-noite (mesma instância do
      // hook, sem remount) e o usuário volta a abrir a tela no dia 2. Sem a
      // correção, hojeISO ficaria travado em 2026-09-15 e recarregar()
      // devolveria o dailyLog de ONTEM (concluida:true) em vez de recalcular
      // "hoje" e cair no ramo de pré-popular a partir de essentialTasks.
      jest.setSystemTime(new Date('2026-09-16T09:00:00Z'));

      await act(async () => {
        await result.current.recarregar();
      });

      expect(result.current.tarefas).toHaveLength(1);
      expect(result.current.tarefas[0].concluida).toBe(false);
      expect(result.current.tarefas[0].origemRecorrenteId).toBe('rec-1');
      expect(result.current.tarefas[0].id).not.toBe(idDia1);

      jest.useRealTimers();
    });

    it('copia tipo e duracaoMinutos da recorrente pra instância de hoje (tarefa de exercício)', async () => {
      buscarDailyLog.mockResolvedValue(null);
      existeAlgumDailyLog.mockResolvedValue(true);
      buscarTarefasRecorrentesAtivas.mockResolvedValue([
        {
          id: 'rec-1',
          titulo: 'Fazer exercício',
          essencial: false,
          ativa: true,
          tipo: 'exercicio',
          duracaoMinutos: 20,
        },
      ]);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.tarefas[0]).toMatchObject({
        tipo: 'exercicio',
        duracaoMinutos: 20,
      });
    });

    it('dailyLog já existente: NÃO repopula com recorrentes (usa o que já está salvo)', async () => {
      buscarDailyLog.mockResolvedValue({
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'Já salva', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      });
      buscarTarefasRecorrentesAtivas.mockResolvedValue([
        { id: 'rec-1', titulo: 'Não deveria aparecer', essencial: true, ativa: true },
      ]);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.tarefas).toEqual([
        { id: '1', titulo: 'Já salva', essencial: true, concluida: true },
      ]);
      expect(buscarTarefasRecorrentesAtivas).not.toHaveBeenCalled();
    });

    it('sem recorrentes ativas, primeiro dia de uso: cai pro exemplo normalmente', async () => {
      buscarDailyLog.mockResolvedValue(null);
      existeAlgumDailyLog.mockResolvedValue(false);
      buscarTarefasRecorrentesAtivas.mockResolvedValue([]);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.tarefas).toHaveLength(3);
    });

    it('adicionarTarefa com repetirTodosOsDias=true: cria a recorrente e grava a tarefa de hoje com origemRecorrenteId', async () => {
      buscarDailyLog.mockResolvedValue(null);
      criarTarefaRecorrente.mockResolvedValue('rec-novo');

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.adicionarTarefa(
          'Meditar',
          false,
          'padrao',
          undefined,
          true,
        );
      });

      expect(criarTarefaRecorrente).toHaveBeenCalledWith(
        'uid-1',
        'Meditar',
        false,
        'padrao',
        undefined,
      );
      const nova = result.current.tarefas.find(t => t.titulo === 'Meditar');
      expect(nova?.origemRecorrenteId).toBe('rec-novo');
      expect(salvarDailyLog).toHaveBeenCalledTimes(1);
      const [, , logGravado] = salvarDailyLog.mock.calls[0];
      expect(
        logGravado.tarefas.find((t: { titulo: string }) => t.titulo === 'Meditar'),
      ).toMatchObject({ origemRecorrenteId: 'rec-novo' });
    });

    it('adicionarTarefa com repetirTodosOsDias=true e tipo exercício: repassa tipo/duracaoMinutos pra criarTarefaRecorrente', async () => {
      buscarDailyLog.mockResolvedValue(null);
      criarTarefaRecorrente.mockResolvedValue('rec-novo');

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.adicionarTarefa(
          'Fazer exercício',
          false,
          'exercicio',
          20,
          true,
        );
      });

      expect(criarTarefaRecorrente).toHaveBeenCalledWith(
        'uid-1',
        'Fazer exercício',
        false,
        'exercicio',
        20,
      );
    });

    it('adicionarTarefa com repetirTodosOsDias=false (ou omitido): não cria recorrente, sem origemRecorrenteId', async () => {
      buscarDailyLog.mockResolvedValue(null);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.adicionarTarefa('Tarefa avulsa', false);
      });

      expect(criarTarefaRecorrente).not.toHaveBeenCalled();
      const nova = result.current.tarefas.find(t => t.titulo === 'Tarefa avulsa');
      expect(nova).not.toHaveProperty('origemRecorrenteId');
    });

    it('repetirTodosOsDias=true com falha ao criar a recorrente: não grava NADA (nem avulsa) e mostra o toast', async () => {
      buscarDailyLog.mockResolvedValue(null);
      criarTarefaRecorrente.mockRejectedValueOnce(new Error('offline'));

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));
      const tarefasAntes = result.current.tarefas;

      await act(async () => {
        await result.current.adicionarTarefa(
          'Vai falhar',
          false,
          'padrao',
          undefined,
          true,
        );
      });

      expect(result.current.tarefas).toEqual(tarefasAntes);
      expect(
        result.current.tarefas.some(t => t.titulo === 'Vai falhar'),
      ).toBe(false);
      expect(salvarDailyLog).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(MSG_FALHA_ADICIONAR);
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useDailyTasks.adicionarTarefa',
      );
    });

    it('repetirTodosOsDias=true mas título inválido: nem valida o título mostrando erro, nem cria a recorrente', async () => {
      buscarDailyLog.mockResolvedValue(null);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.adicionarTarefa('   ', false, 'padrao', undefined, true);
      });

      expect(criarTarefaRecorrente).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Escreva o que você quer fazer');
    });

    it('removerTarefaHoje remove só a entrada de hoje, sem tocar em essentialTasks', async () => {
      buscarDailyLog.mockResolvedValue(null);

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        result.current.removerTarefaHoje('2');
      });

      expect(result.current.tarefas.map(t => t.id)).toEqual(['1', '3']);
      expect(desativarTarefaRecorrente).not.toHaveBeenCalled();
      expect(salvarDailyLog).toHaveBeenCalledTimes(1);
    });

    it('pararDeRepetir desativa o essentialTasks e NÃO mexe na tarefa de hoje', async () => {
      buscarDailyLog.mockResolvedValue({
        data: '2026-09-15',
        tarefas: [
          {
            id: '1',
            titulo: 'Ler 5 páginas',
            essencial: true,
            concluida: false,
            origemRecorrenteId: 'rec-1',
          },
        ],
        statusDia: 'pendente',
        escudoUsado: false,
      });

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));
      const tarefasAntes = result.current.tarefas;

      await act(async () => {
        await result.current.pararDeRepetir('1', 'rec-1');
      });

      expect(desativarTarefaRecorrente).toHaveBeenCalledWith('uid-1', 'rec-1');
      expect(result.current.tarefas).toEqual(tarefasAntes);
      expect(salvarDailyLog).not.toHaveBeenCalled();
    });

    it('pararDeRepetir com falha de rede dispara toast', async () => {
      buscarDailyLog.mockResolvedValue(null);
      desativarTarefaRecorrente.mockRejectedValueOnce(new Error('offline'));

      const { result } = await renderHook(() => useDailyTasks('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.pararDeRepetir('1', 'rec-1');
      });

      expect(showToast).toHaveBeenCalledWith(
        'Não conseguimos salvar agora. Tente de novo.',
      );
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useDailyTasks.pararDeRepetir',
      );
    });
  });

  it('recarregar() com falha de rede dispara o toast de atualização e mantém as tarefas visíveis', async () => {
    buscarDailyLog.mockResolvedValueOnce({
      data: '2026-09-15',
      tarefas: [
        { id: '1', titulo: 'Já na tela', essencial: true, concluida: false },
      ],
      statusDia: 'pendente',
      escudoUsado: false,
    });

    const { result } = await renderHook(() => useDailyTasks('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const tarefasAntes = result.current.tarefas;

    buscarDailyLog.mockRejectedValueOnce(new Error('offline'));

    await act(async () => {
      await result.current.recarregar();
    });

    expect(showToast).toHaveBeenCalledWith(MSG_FALHA_RECARREGAR);
    expect(result.current.tarefas).toEqual(tarefasAntes);
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useDailyTasks.recarregar',
    );
  });
});
