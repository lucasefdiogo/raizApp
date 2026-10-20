import { act, renderHook } from '@testing-library/react-native';
import { useConsentimentoAcessoUso } from './useConsentimentoAcessoUso';
import { hojeISOLocal } from '../domain/data';

jest.mock('../services/firestore');
jest.mock('../native/UsoApps');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const { registrarConsentimentoAcessoUso } = require('../services/firestore');
const { abrirConfiguracoesAcessoUso } = require('../native/UsoApps');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

const showToast = jest.fn();

describe('useConsentimentoAcessoUso', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useToast.mockReturnValue({ showToast });
  });

  it('CA-05: grava o consentimento com a data de hoje e só depois abre as configurações', async () => {
    const ordem: string[] = [];
    registrarConsentimentoAcessoUso.mockImplementationOnce(async () => {
      ordem.push('gravou');
    });
    abrirConfiguracoesAcessoUso.mockImplementationOnce(() => {
      ordem.push('abriu');
    });

    const { result } = await renderHook(() => useConsentimentoAcessoUso('uid-1'));
    let sucesso: boolean | undefined;
    await act(async () => {
      sucesso = await result.current.permitir();
    });

    expect(sucesso).toBe(true);
    expect(registrarConsentimentoAcessoUso).toHaveBeenCalledWith(
      'uid-1',
      hojeISOLocal(),
    );
    expect(ordem).toEqual(['gravou', 'abriu']);
  });

  it('CA-05: falha ao gravar mostra toast, resolve false e não abre as configurações', async () => {
    registrarConsentimentoAcessoUso.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useConsentimentoAcessoUso('uid-1'));
    let sucesso: boolean | undefined;
    await act(async () => {
      sucesso = await result.current.permitir();
    });

    expect(sucesso).toBe(false);
    expect(abrirConfiguracoesAcessoUso).not.toHaveBeenCalled();
    expect(registrarErro).toHaveBeenCalledWith(
      expect.any(Error),
      'useConsentimentoAcessoUso.permitir',
    );
    expect(showToast).toHaveBeenCalledWith(
      'Não conseguimos registrar seu consentimento agora. Tente de novo.',
    );
  });
});
