import { act, renderHook } from '@testing-library/react-native';
import { useConsentimentoAcessibilidade } from './useConsentimentoAcessibilidade';

jest.mock('../services/firestore');
jest.mock('../native/AccessibilityDetection');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const { registrarConsentimentoAcessibilidade } = require('../services/firestore');
const { openAccessibilitySettings } = require('../native/AccessibilityDetection');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

const showToast = jest.fn();

describe('useConsentimentoAcessibilidade', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useToast.mockReturnValue({ showToast });
  });

  it('grava o consentimento e SÓ DEPOIS abre as configurações de acessibilidade', async () => {
    registrarConsentimentoAcessibilidade.mockResolvedValue(undefined);
    const ordem: string[] = [];
    registrarConsentimentoAcessibilidade.mockImplementationOnce(async () => {
      ordem.push('gravou');
    });
    openAccessibilitySettings.mockImplementationOnce(() => {
      ordem.push('abriu');
    });

    const { result } = await renderHook(() => useConsentimentoAcessibilidade('uid-1'));

    let sucesso: boolean | undefined;
    await act(async () => {
      sucesso = await result.current.concordarEAtivar();
    });

    expect(sucesso).toBe(true);
    expect(registrarConsentimentoAcessibilidade).toHaveBeenCalledWith(
      'uid-1',
      expect.any(String),
    );
    expect(openAccessibilitySettings).toHaveBeenCalledTimes(1);
    expect(ordem).toEqual(['gravou', 'abriu']);
  });

  it('falha ao gravar: registra erro, mostra toast, resolve false e NÃO abre as configurações', async () => {
    registrarConsentimentoAcessibilidade.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useConsentimentoAcessibilidade('uid-1'));

    let sucesso: boolean | undefined;
    await act(async () => {
      sucesso = await result.current.concordarEAtivar();
    });

    expect(sucesso).toBe(false);
    expect(openAccessibilitySettings).not.toHaveBeenCalled();
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useConsentimentoAcessibilidade.concordarEAtivar',
    );
    expect(showToast).toHaveBeenCalledWith(
      'Não conseguimos registrar seu consentimento agora. Tente de novo.',
    );
  });
});
