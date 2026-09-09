import {
  criarDocumentoUsuario,
  buscarUsuario,
  salvarOnboardingUsuario,
  buscarSystemMessage,
  adicionarTarefaAoDailyLog,
  atualizarStatusStreak,
  buscarDailyLog,
  buscarUltimosDailyLogs,
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
      await salvarOnboardingUsuario('uid-1', {
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

  describe('salvarOnboardingUsuario', () => {
    it('grava os três campos sem apagar o restante do documento', async () => {
      await criarDocumentoUsuario('uid-1', 'a@a.com');

      await salvarOnboardingUsuario('uid-1', {
        porqueTexto: 'Meu porquê',
        focoProcrastinacao: 'trabalho',
        tempoTelaEstimado: 3,
      });

      const usuario = await buscarUsuario('uid-1');
      expect(usuario).toMatchObject({
        email: 'a@a.com',
        porqueTexto: 'Meu porquê',
        focoProcrastinacao: 'trabalho',
        tempoTelaEstimado: 3,
        streakAtual: 0,
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
});
