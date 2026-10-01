import {
  criarDocumentoUsuario,
  buscarUsuario,
  atualizarDadosOnboarding,
  buscarSystemMessage,
  adicionarTarefaAoDailyLog,
  atualizarStatusStreak,
  buscarDailyLog,
  buscarUltimosDailyLogs,
  existeAlgumDailyLog,
  salvarDailyLog,
  garantirDailyLogDoDia,
  registrarSessaoFocoNoDia,
  registrarInterceptacaoNoDia,
  salvarRegrasBloqueioImediatas,
  salvarRegrasBloqueioPendentes,
  cancelarRegrasBloqueioPendentes,
  promoverRegrasBloqueioPendentes,
  atualizarPerfilUsuario,
  apagarTodosOsDadosDoUsuario,
  preencherNomeSeVazio,
  removerTarefaDoDia,
  criarTarefaRecorrente,
  buscarTarefasRecorrentesAtivas,
  desativarTarefaRecorrente,
  marcarOnboardingConcluido,
} from './firestore';

const firestoreMock = require('@react-native-firebase/firestore');

describe('services/firestore', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describe('criarDocumentoUsuario', () => {
    it('cria o documento com os campos default na primeira vez', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        email: 'a@a.com',
        nome: '',
        porqueTexto: null,
        focoProcrastinacao: null,
        tempoTelaEstimado: null,
        streakAtual: 0,
        diasTotaisAtivos: 0,
        escudosDisponiveis: 1,
        ultimoDiaAtivo: null,
        statusStreak: 'ativo',
        marcosAtingidos: [],
        notificacoesAtivas: true,
        horarioLembreteDiario: null,
        onboardingConcluido: false,
      });
    });

    it('grava o nome quando informado (cadastro por e-mail ou displayName do Google)', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com', 'Ana');

      const usuario = await buscarUsuario('uid-1');
      expect(usuario?.nome).toBe('Ana');
    });

    it('é idempotente — não sobrescreve um documento já existente', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await atualizarDadosOnboarding('uid-1', {
        porqueTexto: 'Quero terminar meus estudos',
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 4,
      });

      await criarDocumentoUsuario('uid-1', 'a@a.com');

      const usuario = await buscarUsuario('uid-1');
      expect(usuario?.porqueTexto).toBe('Quero terminar meus estudos');
    });

    it('idempotente também pro nome — uma segunda chamada não sobrescreve o nome já gravado', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com', 'Ana');

      await criarDocumentoUsuario('uid-1', 'a@a.com', 'Outro nome');

      expect((await buscarUsuario('uid-1'))?.nome).toBe('Ana');
    });

    it('roda sem risco tanto para e-mail/senha quanto para Google', async () => {
      await criarDocumentoUsuario('uid-email', 'email@a.com');
      await criarDocumentoUsuario('uid-google', 'google@a.com');

      expect((await buscarUsuario('uid-email'))?.email).toBe('email@a.com');
      expect((await buscarUsuario('uid-google'))?.email).toBe('google@a.com');
    });
  });

  describe('preencherNomeSeVazio', () => {
    it('preenche o nome quando o documento existe e o nome está vazio (conta Google anterior à mudança)', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com'); // nome '' (comportamento antigo)

      await preencherNomeSeVazio('uid-1', 'Ana');

      expect((await buscarUsuario('uid-1'))?.nome).toBe('Ana');
    });

    it('não sobrescreve um nome já gravado', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com', 'Ana');

      await preencherNomeSeVazio('uid-1', 'Outro nome');

      expect((await buscarUsuario('uid-1'))?.nome).toBe('Ana');
    });

    it('não faz nada quando o nome novo também é vazio', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await preencherNomeSeVazio('uid-1', '');

      expect((await buscarUsuario('uid-1'))?.nome).toBe('');
    });

    it('não quebra quando o documento do usuário não existe', async () => {
      await expect(
        preencherNomeSeVazio('uid-inexistente', 'Ana'),
      ).resolves.toBeUndefined();
    });

    it('não apaga o restante do documento', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await preencherNomeSeVazio('uid-1', 'Ana');

      const usuario = await buscarUsuario('uid-1');
      expect(usuario?.email).toBe('a@a.com');
      expect(usuario?.streakAtual).toBe(0);
    });
  });

  describe('buscarUsuario', () => {
    it('retorna null quando o documento não existe', async () => {
      const usuario = await buscarUsuario('uid-inexistente');
      expect(usuario).toBeNull();
    });
  });

  describe('atualizarDadosOnboarding', () => {
    it('grava só o campo passado, sem apagar o restante do documento', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await atualizarDadosOnboarding('uid-1', { focoProcrastinacao: 'trabalho' });

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        email: 'a@a.com',
        focoProcrastinacao: 'trabalho',
        porqueTexto: null,
        tempoTelaEstimado: null,
        streakAtual: 0,
      });
    });

    it('acumula os campos ao longo de várias chamadas (uma por passo)', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await atualizarDadosOnboarding('uid-1', { focoProcrastinacao: 'estudos' });
      await atualizarDadosOnboarding('uid-1', { tempoTelaEstimado: 4 });
      await atualizarDadosOnboarding('uid-1', { porqueTexto: 'Meu porquê' });

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 4,
        porqueTexto: 'Meu porquê',
      });
    });
  });

  describe('marcarOnboardingConcluido', () => {
    it('marca onboardingConcluido: true sem apagar o restante do documento', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await atualizarDadosOnboarding('uid-1', { porqueTexto: 'Meu porquê' });

      await marcarOnboardingConcluido('uid-1');

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        email: 'a@a.com',
        porqueTexto: 'Meu porquê',
        onboardingConcluido: true,
      });
    });
  });

  describe('buscarSystemMessage', () => {
    it('lê o título e o corpo da chave informada', async () => {
      const referencia = firestoreMock.doc(
        firestoreMock.getFirestore(),
        'systemMessages',
        'marco_7',
      );
      await firestoreMock.setDoc(referencia, {
        titulo: 'Sete dias seguidos',
        corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
      });

      const mensagem = await buscarSystemMessage('marco_7');

      expect(mensagem).toEqual({
        titulo: 'Sete dias seguidos',
        corpo: 'Uma semana inteira sustentando o combinado com você mesmo.',
      });
    });

    it('retorna null quando a chave não existe', async () => {
      const mensagem = await buscarSystemMessage('marco_inexistente');
      expect(mensagem).toBeNull();
    });
  });

  describe('salvarDailyLog', () => {
    it('cria dailyLogs/{data} quando ainda não existe', async () => {
      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'tarefa', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log).toEqual({
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'tarefa', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      });
    });

    it('sobrescreve o documento por inteiro numa segunda chamada', async () => {
      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'tarefa', essencial: true, concluida: false },
        ],
        statusDia: 'pendente',
        escudoUsado: false,
      });

      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'tarefa', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.statusDia).toBe('cumprido');
      expect(log?.tarefas[0].concluida).toBe(true);
    });
  });

  describe('registrarSessaoFocoNoDia / registrarInterceptacaoNoDia (arrayUnion)', () => {
    function sessao(id: string) {
      return {
        id,
        tarefaId: null,
        origem: 'travado' as const,
        estadoTravado: 'tedio' as const,
        duracaoPlanejadaSeg: 300,
        duracaoRealSeg: 300,
        resultado: 'parou' as const,
        criadoEm: '2026-09-15T12:00:00.000',
      };
    }

    function interceptacao(app: string) {
      return {
        app,
        hora: '2026-09-15T12:00:00.000',
        estadoTela: 'A' as const,
        acao: 'saiu' as const,
      };
    }

    it('registrarSessaoFocoNoDia cria o documento na primeira chamada', async () => {
      await registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s1'));

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.sessoesFoco).toEqual([sessao('s1')]);
    });

    it('registrarSessaoFocoNoDia acrescenta sem apagar as sessões já gravadas', async () => {
      await registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s1'));
      await registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s2'));

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.sessoesFoco).toEqual([sessao('s1'), sessao('s2')]);
    });

    it('registrarSessaoFocoNoDia não apaga tarefas/statusDia/escudoUsado já gravados', async () => {
      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [{ id: '1', titulo: 't', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      await registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s1'));

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.statusDia).toBe('cumprido');
      expect(log?.tarefas).toHaveLength(1);
    });

    it('registrarSessaoFocoNoDia usa arrayUnion (atômico), não leitura+escrita manual', async () => {
      await registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s1'));

      expect(firestoreMock.arrayUnion).toHaveBeenCalledWith(sessao('s1'));
      expect(firestoreMock.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sessoesFoco: { __arrayUnion: [sessao('s1')] },
        }),
        { merge: true },
      );
    });

    it('registrarInterceptacaoNoDia acrescenta sem apagar as interceptações já gravadas', async () => {
      await registrarInterceptacaoNoDia(
        'uid-1',
        '2026-09-15',
        interceptacao('com.instagram.android'),
      );
      await registrarInterceptacaoNoDia(
        'uid-1',
        '2026-09-15',
        interceptacao('com.whatsapp'),
      );

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.interceptacoes).toEqual([
        interceptacao('com.instagram.android'),
        interceptacao('com.whatsapp'),
      ]);
    });

    it('duas gravações "concorrentes" (mesma leitura de base) não se pisam', async () => {
      // Antes da correção, registrarSessaoFocoNoDia lia o array, acrescentava
      // em memória e regravava o array inteiro — duas chamadas que leem o
      // mesmo estado de base perderiam uma da outra. Com arrayUnion, as duas
      // resolvem contra o documento do servidor, não contra uma leitura
      // prévia — nunca se pisam mesmo "em paralelo".
      await Promise.all([
        registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s1')),
        registrarSessaoFocoNoDia('uid-1', '2026-09-15', sessao('s2')),
      ]);

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.sessoesFoco).toHaveLength(2);
    });
  });

  describe('garantirDailyLogDoDia', () => {
    it('cria dailyLogs/{data} pendente com as tarefas iniciais quando ainda não existe', async () => {
      await garantirDailyLogDoDia('uid-1', '2026-09-15', [
        { id: 'recorrente-rec-1-2026-09-15', titulo: 'Ler 5 páginas', essencial: true, concluida: false, origemRecorrenteId: 'rec-1' },
      ]);

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log).toEqual({
        data: '2026-09-15',
        tarefas: [
          { id: 'recorrente-rec-1-2026-09-15', titulo: 'Ler 5 páginas', essencial: true, concluida: false, origemRecorrenteId: 'rec-1' },
        ],
        statusDia: 'pendente',
        escudoUsado: false,
      });
    });

    it('sem nenhuma tarefa recorrente: cria o dia com tarefas vazio (nunca TAREFAS_EXEMPLO)', async () => {
      await garantirDailyLogDoDia('uid-1', '2026-09-15', []);

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.tarefas).toEqual([]);
      expect(log?.statusDia).toBe('pendente');
    });

    it('idempotente: não sobrescreve um dia que já tem progresso real', async () => {
      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'tarefa concluída de verdade', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      await garantirDailyLogDoDia('uid-1', '2026-09-15', [
        { id: 'outra', titulo: 'não deveria aparecer', essencial: false, concluida: false },
      ]);

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log).toEqual({
        data: '2026-09-15',
        tarefas: [
          { id: '1', titulo: 'tarefa concluída de verdade', essencial: true, concluida: true },
        ],
        statusDia: 'cumprido',
        escudoUsado: false,
      });
    });

    it('não vaza entre usuários nem entre datas', async () => {
      await garantirDailyLogDoDia('uid-1', '2026-09-15', []);

      expect(await buscarDailyLog('uid-2', '2026-09-15')).toBeNull();
      expect(await buscarDailyLog('uid-1', '2026-09-16')).toBeNull();
    });
  });

  describe('adicionarTarefaAoDailyLog', () => {
    it('cria o dailyLogs/{data} quando ele ainda não existe', async () => {
      await adicionarTarefaAoDailyLog('uid-1', '2026-09-10', {
        id: 'inicial-1',
        titulo: 'Guardar o celular na gaveta às 20h',
        essencial: true,
        concluida: false,
      });

      const log = await buscarDailyLog('uid-1', '2026-09-10');
      expect(log).toMatchObject({
        data: '2026-09-10',
        tarefas: [
          {
            id: 'inicial-1',
            titulo: 'Guardar o celular na gaveta às 20h',
            essencial: true,
            concluida: false,
          },
        ],
        statusDia: 'pendente',
        escudoUsado: false,
      });
    });

    it('acrescenta à lista de tarefas existente sem apagar as anteriores', async () => {
      await adicionarTarefaAoDailyLog('uid-1', '2026-09-10', {
        id: '1',
        titulo: 'Primeira',
        essencial: false,
        concluida: true,
      });
      await adicionarTarefaAoDailyLog('uid-1', '2026-09-10', {
        id: '2',
        titulo: 'Segunda',
        essencial: true,
        concluida: false,
      });

      const log = await buscarDailyLog('uid-1', '2026-09-10');
      expect(log?.tarefas).toHaveLength(2);
      expect(log?.tarefas.map(t => t.id)).toEqual(['1', '2']);
    });
  });

  describe('removerTarefaDoDia', () => {
    it('remove só a tarefa pedida, mantendo as outras', async () => {
      await salvarDailyLog('uid-1', '2026-09-10', {
        data: '2026-09-10',
        tarefas: [
          { id: '1', titulo: 'Primeira', essencial: false, concluida: true },
          { id: '2', titulo: 'Segunda', essencial: true, concluida: false },
        ],
        statusDia: 'pendente',
        escudoUsado: false,
      });

      await removerTarefaDoDia('uid-1', '2026-09-10', '1');

      const log = await buscarDailyLog('uid-1', '2026-09-10');
      expect(log?.tarefas.map(t => t.id)).toEqual(['2']);
    });

    it('não mexe em statusDia/escudoUsado', async () => {
      await salvarDailyLog('uid-1', '2026-09-10', {
        data: '2026-09-10',
        tarefas: [{ id: '1', titulo: 'A', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: true,
      });

      await removerTarefaDoDia('uid-1', '2026-09-10', '1');

      const log = await buscarDailyLog('uid-1', '2026-09-10');
      expect(log?.statusDia).toBe('cumprido');
      expect(log?.escudoUsado).toBe(true);
      expect(log?.tarefas).toEqual([]);
    });

    it('não quebra quando o dailyLog não existe', async () => {
      await expect(
        removerTarefaDoDia('uid-1', '2026-09-10', 'inexistente'),
      ).resolves.toBeUndefined();
    });

    it('não quebra quando o id não está na lista (no-op)', async () => {
      await salvarDailyLog('uid-1', '2026-09-10', {
        data: '2026-09-10',
        tarefas: [{ id: '1', titulo: 'A', essencial: true, concluida: true }],
        statusDia: 'pendente',
        escudoUsado: false,
      });

      await removerTarefaDoDia('uid-1', '2026-09-10', 'inexistente');

      const log = await buscarDailyLog('uid-1', '2026-09-10');
      expect(log?.tarefas).toHaveLength(1);
    });
  });

  describe('tarefas recorrentes (essentialTasks)', () => {
    describe('criarTarefaRecorrente', () => {
      it('cria o documento em essentialTasks com ativa: true e retorna o id', async () => {
        const id = await criarTarefaRecorrente(
          'uid-1',
          'Ler 5 páginas',
          true,
        );

        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);

        const tarefas = await buscarTarefasRecorrentesAtivas('uid-1');
        expect(tarefas).toHaveLength(1);
        expect(tarefas[0]).toMatchObject({
          id,
          titulo: 'Ler 5 páginas',
          essencial: true,
          ativa: true,
        });
      });

      it('duas chamadas seguidas geram ids diferentes', async () => {
        const id1 = await criarTarefaRecorrente('uid-1', 'Primeira', false);
        const id2 = await criarTarefaRecorrente('uid-1', 'Segunda', false);

        expect(id1).not.toBe(id2);
      });

      it('grava tipo e duracaoMinutos quando a recorrente é de exercício', async () => {
        const id = await criarTarefaRecorrente(
          'uid-1',
          'Fazer exercício',
          false,
          'exercicio',
          20,
        );

        const tarefas = await buscarTarefasRecorrentesAtivas('uid-1');
        expect(tarefas.find(t => t.id === id)).toMatchObject({
          tipo: 'exercicio',
          duracaoMinutos: 20,
        });
      });

      it('não grava tipo/duracaoMinutos pra recorrente comum (retrocompatível)', async () => {
        const id = await criarTarefaRecorrente('uid-1', 'Ler 5 páginas', true);

        const tarefas = await buscarTarefasRecorrentesAtivas('uid-1');
        const criada = tarefas.find(t => t.id === id);
        expect(criada).not.toHaveProperty('tipo');
        expect(criada).not.toHaveProperty('duracaoMinutos');
      });
    });

    describe('buscarTarefasRecorrentesAtivas', () => {
      it('lista vazia quando o usuário nunca criou nenhuma', async () => {
        expect(await buscarTarefasRecorrentesAtivas('uid-1')).toEqual([]);
      });

      it('não lista as que já foram desativadas', async () => {
        const id1 = await criarTarefaRecorrente('uid-1', 'Ativa', true);
        const id2 = await criarTarefaRecorrente('uid-1', 'Vai desativar', false);

        await desativarTarefaRecorrente('uid-1', id2);

        const ativas = await buscarTarefasRecorrentesAtivas('uid-1');
        expect(ativas.map(t => t.id)).toEqual([id1]);
      });

      it('não vaza entre usuários', async () => {
        await criarTarefaRecorrente('uid-1', 'Do uid-1', true);

        expect(await buscarTarefasRecorrentesAtivas('uid-2')).toEqual([]);
      });
    });

    describe('desativarTarefaRecorrente', () => {
      it('marca ativa: false sem apagar título/essencial', async () => {
        const id = await criarTarefaRecorrente('uid-1', 'Ler', true);

        await desativarTarefaRecorrente('uid-1', id);

        const tarefas = await buscarTarefasRecorrentesAtivas('uid-1');
        expect(tarefas).toEqual([]);
        // a busca só filtra ativas — confirma que o doc em si não foi
        // apagado, só o campo ativa mudou, lendo o dado bruto do mock.
        expect(firestoreMock.__dados(`users/uid-1/essentialTasks/${id}`)).toMatchObject({
          titulo: 'Ler',
          essencial: true,
          ativa: false,
        });
      });
    });
  });

  describe('buscarUltimosDailyLogs', () => {
    it('retorna só os dias que têm dailyLog, ignorando os que faltam', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-14T12:00:00Z'));

      await adicionarTarefaAoDailyLog('uid-1', '2026-09-14', {
        id: '1',
        titulo: 'hoje',
        essencial: true,
        concluida: true,
      });
      await adicionarTarefaAoDailyLog('uid-1', '2026-09-12', {
        id: '1',
        titulo: 'dois dias atrás',
        essencial: true,
        concluida: false,
      });

      const logs = await buscarUltimosDailyLogs('uid-1', 7);

      expect(logs.map(log => log.data).sort()).toEqual([
        '2026-09-12',
        '2026-09-14',
      ]);

      jest.useRealTimers();
    });
  });

  describe('existeAlgumDailyLog', () => {
    it('false quando o usuário nunca gravou nenhum dailyLog', async () => {
      expect(await existeAlgumDailyLog('uid-1')).toBe(false);
    });

    it('true assim que existe qualquer dailyLog, mesmo de outra data', async () => {
      await salvarDailyLog('uid-1', '2026-08-30', {
        data: '2026-08-30',
        tarefas: [{ id: '1', titulo: 'x', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      expect(await existeAlgumDailyLog('uid-1')).toBe(true);
    });

    it('não vaza entre usuários', async () => {
      await salvarDailyLog('uid-1', '2026-08-30', {
        data: '2026-08-30',
        tarefas: [{ id: '1', titulo: 'x', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      expect(await existeAlgumDailyLog('uid-2')).toBe(false);
    });
  });

  describe('atualizarStatusStreak', () => {
    it('grava o novo statusStreak sem apagar o restante do documento', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await atualizarStatusStreak('uid-1', 'pausado');
      expect((await buscarUsuario('uid-1'))?.statusStreak).toBe('pausado');

      await atualizarStatusStreak('uid-1', 'ativo');
      const usuario = await buscarUsuario('uid-1');
      expect(usuario?.statusStreak).toBe('ativo');
      expect(usuario?.email).toBe('a@a.com');
    });
  });

  describe('salvarRegrasBloqueioImediatas / salvarRegrasBloqueioPendentes / cancelarRegrasBloqueioPendentes / promoverRegrasBloqueioPendentes', () => {
    const regras = {
      apps: ['com.instagram.android'],
      janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
    };
    const pendente = { ...regras, efetivaEm: '2026-09-25' };

    it('salvarRegrasBloqueioImediatas grava regrasBloqueio sem mexer em outros campos', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await salvarRegrasBloqueioImediatas('uid-1', regras);

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({ email: 'a@a.com', regrasBloqueio: regras });
    });

    it('salvarRegrasBloqueioPendentes grava regrasBloqueioPendentes sem tocar em regrasBloqueio', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await salvarRegrasBloqueioImediatas('uid-1', regras);

      await salvarRegrasBloqueioPendentes('uid-1', pendente);

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        regrasBloqueio: regras,
        regrasBloqueioPendentes: pendente,
      });
    });

    it('salvarRegrasBloqueioPendentes substitui uma pendência anterior', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await salvarRegrasBloqueioPendentes('uid-1', pendente);

      const novaPendente = { apps: [], janelas: [], efetivaEm: '2026-09-26' };
      await salvarRegrasBloqueioPendentes('uid-1', novaPendente);

      const usuario = await buscarUsuario('uid-1');
      expect(usuario?.regrasBloqueioPendentes).toEqual(novaPendente);
    });

    it('cancelarRegrasBloqueioPendentes apaga a pendência na hora', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await salvarRegrasBloqueioPendentes('uid-1', pendente);

      await cancelarRegrasBloqueioPendentes('uid-1');

      const usuario = await buscarUsuario('uid-1');
      expect(usuario?.regrasBloqueioPendentes).toBeNull();
    });

    it('promoverRegrasBloqueioPendentes grava a nova vigente e limpa a pendência', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await salvarRegrasBloqueioImediatas('uid-1', regras);
      await salvarRegrasBloqueioPendentes('uid-1', pendente);

      await promoverRegrasBloqueioPendentes('uid-1', {
        apps: pendente.apps,
        janelas: pendente.janelas,
      });

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        regrasBloqueio: { apps: pendente.apps, janelas: pendente.janelas },
        regrasBloqueioPendentes: null,
      });
    });
  });

  describe('atualizarPerfilUsuario', () => {
    it('atualiza só os campos passados, sem apagar o restante do documento', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await atualizarPerfilUsuario('uid-1', {
        porqueTexto: 'Terminar meus estudos',
        notificacoesAtivas: true,
        horarioLembreteDiario: '08:00',
      });

      await atualizarPerfilUsuario('uid-1', { notificacoesAtivas: false });

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        email: 'a@a.com',
        porqueTexto: 'Terminar meus estudos',
        notificacoesAtivas: false,
        horarioLembreteDiario: '08:00',
      });
    });

    it('atualiza só o porquê sem mexer em notificacoesAtivas/horarioLembreteDiario', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');
      await atualizarPerfilUsuario('uid-1', {
        notificacoesAtivas: true,
        horarioLembreteDiario: '20:00',
      });

      await atualizarPerfilUsuario('uid-1', { porqueTexto: 'Novo porquê' });

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        porqueTexto: 'Novo porquê',
        notificacoesAtivas: true,
        horarioLembreteDiario: '20:00',
      });
    });
  });

  describe('apagarTodosOsDadosDoUsuario', () => {
    async function semearUsuarioComDados(uid: string) {
      await criarDocumentoUsuario(uid, `${uid}@a.com`);
      await salvarDailyLog(uid, '2026-09-01', {
        data: '2026-09-01',
        tarefas: [{ id: '1', titulo: 't', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      });
      await salvarDailyLog(uid, '2026-09-02', {
        data: '2026-09-02',
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
      });
      const essencialRef = firestoreMock.doc(
        firestoreMock.getFirestore(),
        'users',
        uid,
        'essentialTasks',
        'et-1',
      );
      await firestoreMock.setDoc(essencialRef, { titulo: 'antiga essencial' });
    }

    it('apaga dailyLogs, essentialTasks e o documento do usuário', async () => {
      await semearUsuarioComDados('uid-1');

      await apagarTodosOsDadosDoUsuario('uid-1');

      expect(firestoreMock.__dados('users/uid-1')).toBeUndefined();
      expect(
        firestoreMock.__dados('users/uid-1/dailyLogs/2026-09-01'),
      ).toBeUndefined();
      expect(
        firestoreMock.__dados('users/uid-1/dailyLogs/2026-09-02'),
      ).toBeUndefined();
      expect(
        firestoreMock.__dados('users/uid-1/essentialTasks/et-1'),
      ).toBeUndefined();
      expect(await buscarUsuario('uid-1')).toBeNull();
      expect(await existeAlgumDailyLog('uid-1')).toBe(false);
    });

    it('não toca nos dados de outro usuário', async () => {
      await semearUsuarioComDados('uid-1');
      await semearUsuarioComDados('uid-2');

      await apagarTodosOsDadosDoUsuario('uid-1');

      expect(await buscarUsuario('uid-2')).not.toBeNull();
      expect(await existeAlgumDailyLog('uid-2')).toBe(true);
      expect(
        firestoreMock.__dados('users/uid-2/essentialTasks/et-1'),
      ).toBeDefined();
    });

    it('não quebra quando não há subcoleções (só o documento do usuário)', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await expect(
        apagarTodosOsDadosDoUsuario('uid-1'),
      ).resolves.toBeUndefined();
      expect(await buscarUsuario('uid-1')).toBeNull();
    });
  });
});
