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
});
