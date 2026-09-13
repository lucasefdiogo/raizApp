import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStatus } from './useOnboardingStatus';

jest.mock('../services/firestore');
const firestoreService = require('../services/firestore');

describe('useOnboardingStatus', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    firestoreService.buscarUsuario.mockResolvedValue(null);
  });

  it('não é completo quando não há dado local nem remoto', async () => {
    const { result } = await renderHook(() => useOnboardingStatus('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.completo).toBe(false);
  });

  it('é completo quando o rascunho local já é válido (resposta otimista)', async () => {
    await AsyncStorage.setItem(
      '@rootora/onboarding',
      JSON.stringify({
        porqueTexto: 'Quero terminar meus estudos',
        focoProcrastinacao: 'estudos',
        tempoTelaEstimado: 4,
      }),
    );

    const { result } = await renderHook(() => useOnboardingStatus('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.completo).toBe(true);
  });

  it('é completo quando users/{uid}.onboardingConcluido já é true no Firestore', async () => {
    firestoreService.buscarUsuario.mockResolvedValue({
      porqueTexto: 'Meu porquê salvo no Firestore',
      onboardingConcluido: true,
    });

    const { result } = await renderHook(() => useOnboardingStatus('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.completo).toBe(true);
  });

  it('NÃO é completo só com porqueTexto preenchido — onboardingConcluido ainda false não sai do onboarding', async () => {
    firestoreService.buscarUsuario.mockResolvedValue({
      porqueTexto: 'Meu porquê salvo no Firestore',
      onboardingConcluido: false,
    });

    const { result } = await renderHook(() => useOnboardingStatus('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.completo).toBe(false);
  });

  it('NÃO é completo com porqueTexto preenchido e onboardingConcluido ausente (conta anterior a esse campo)', async () => {
    firestoreService.buscarUsuario.mockResolvedValue({
      porqueTexto: 'Meu porquê salvo no Firestore',
    });

    const { result } = await renderHook(() => useOnboardingStatus('uid-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.completo).toBe(false);
  });

  it('não consulta o Firestore quando não há uid', async () => {
    const { result } = await renderHook(() => useOnboardingStatus(null));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.completo).toBe(false);
    expect(firestoreService.buscarUsuario).not.toHaveBeenCalled();
  });
});
