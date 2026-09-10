import { renderHook, waitFor } from '@testing-library/react-native';
import { PASSO_ONBOARDING } from '../domain/onboarding';
import { useOnboardingProgress } from './useOnboardingProgress';

jest.mock('../services/firestore');
const {
  buscarUsuario,
  atualizarDadosOnboarding,
} = require('../services/firestore');

function usuario(overrides = {}) {
  return {
    focoProcrastinacao: null,
    tempoTelaEstimado: null,
    porqueTexto: null,
    ...overrides,
  };
}

describe('useOnboardingProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    atualizarDadosOnboarding.mockResolvedValue(undefined);
  });

  describe('passoInicial', () => {
    it('nenhum dado ainda: começa no passo do foco', async () => {
      buscarUsuario.mockResolvedValue(usuario());

      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.passoInicial).toBe(PASSO_ONBOARDING.foco);
    });

    it('só o diagnóstico de foco salvo: começa no passo do tempo de tela', async () => {
      buscarUsuario.mockResolvedValue(usuario({ focoProcrastinacao: 'estudos' }));

      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.passoInicial).toBe(PASSO_ONBOARDING.tempoTela);
    });

    it('diagnóstico completo (foco + tempo), sem porquê: começa no passo do porquê', async () => {
      buscarUsuario.mockResolvedValue(
        usuario({ focoProcrastinacao: 'estudos', tempoTelaEstimado: 4 }),
      );

      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.passoInicial).toBe(PASSO_ONBOARDING.porque);
      expect(result.current.dadosExistentes).toEqual({
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 4,
        porqueTexto: '',
      });
    });

    it('diagnóstico + porquê já preenchidos: permanece no passo do porquê', async () => {
      buscarUsuario.mockResolvedValue(
        usuario({
          focoProcrastinacao: 'estudos',
          tempoTelaEstimado: 4,
          porqueTexto: 'Quero terminar meus estudos',
        }),
      );

      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.passoInicial).toBe(PASSO_ONBOARDING.porque);
    });

    it('usuário inexistente no Firestore: começa no passo do foco', async () => {
      buscarUsuario.mockResolvedValue(null);

      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));

      await waitFor(() => expect(result.current.carregando).toBe(false));
      expect(result.current.passoInicial).toBe(PASSO_ONBOARDING.foco);
    });
  });

  describe('funções de salvar', () => {
    beforeEach(() => {
      buscarUsuario.mockResolvedValue(usuario());
    });

    it('salvarFoco grava só focoProcrastinacao', async () => {
      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await result.current.salvarFoco('trabalho');

      expect(atualizarDadosOnboarding).toHaveBeenCalledWith('uid-1', {
        focoProcrastinacao: 'trabalho',
      });
    });

    it('salvarTempoTela grava só tempoTelaEstimado', async () => {
      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await result.current.salvarTempoTela(3);

      expect(atualizarDadosOnboarding).toHaveBeenCalledWith('uid-1', {
        tempoTelaEstimado: 3,
      });
    });

    it('salvarPorque grava porqueTexto com trim', async () => {
      const { result } = await renderHook(() => useOnboardingProgress('uid-1'));
      await waitFor(() => expect(result.current.carregando).toBe(false));

      await result.current.salvarPorque('  Quero terminar meus estudos  ');

      expect(atualizarDadosOnboarding).toHaveBeenCalledWith('uid-1', {
        porqueTexto: 'Quero terminar meus estudos',
      });
    });
  });
});
