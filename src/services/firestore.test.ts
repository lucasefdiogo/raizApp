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
  atualizarPerfilUsuario,
  apagarTodosOsDadosDoUsuario,
  buscarDesbloqueiosHojeDoApp,
  incrementarDesbloqueiosHoje,
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

  describe('buscarDesbloqueiosHojeDoApp', () => {
    it('0 quando o dailyLog ainda não existe', async () => {
      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-15')).toBe(0);
    });

    it('0 quando o dailyLog existe mas nunca teve desbloqueio', async () => {
      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
      });

      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-15')).toBe(0);
    });

    it('lê o valor já gravado', async () => {
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');

      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-15')).toBe(2);
    });
  });

  describe('incrementarDesbloqueiosHoje', () => {
    it('cria o dailyLogs/{data} com desbloqueiosApps: 1 na primeira chamada', async () => {
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');

      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-15')).toBe(1);
    });

    it('acumula ao longo de várias chamadas', async () => {
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');

      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-15')).toBe(3);
    });

    it('não apaga o restante do dailyLog (tarefas, statusDia)', async () => {
      await salvarDailyLog('uid-1', '2026-09-15', {
        data: '2026-09-15',
        tarefas: [{ id: '1', titulo: 't', essencial: true, concluida: true }],
        statusDia: 'cumprido',
        escudoUsado: false,
      });

      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');

      const log = await buscarDailyLog('uid-1', '2026-09-15');
      expect(log?.statusDia).toBe('cumprido');
      expect(log?.tarefas).toHaveLength(1);
      expect(log?.desbloqueiosApps).toBe(1);
    });

    it('usa o incremento atômico do Firestore (increment), não leitura+escrita manual', async () => {
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');

      expect(firestoreMock.increment).toHaveBeenCalledWith(1);
      expect(firestoreMock.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ desbloqueiosApps: { __increment: 1 } }),
        { merge: true },
      );
    });

    it('não vaza entre datas diferentes', async () => {
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-15');
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-16');
      await incrementarDesbloqueiosHoje('uid-1', '2026-09-16');

      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-15')).toBe(1);
      expect(await buscarDesbloqueiosHojeDoApp('uid-1', '2026-09-16')).toBe(2);
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
