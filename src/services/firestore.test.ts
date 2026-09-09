import {
  criarDocumentoUsuario,
  buscarUsuario,
  salvarOnboardingUsuario,
  buscarSystemMessage,
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
});
