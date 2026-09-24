import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useIntercept } from './useIntercept';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('../services/analytics');

const { buscarDailyLog, registrarInterceptacaoNoDia } = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');
const { logInterceptAction } = require('../services/analytics');

describe('useIntercept', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    buscarDailyLog.mockResolvedValue(null);
    registrarInterceptacaoNoDia.mockResolvedValue(undefined);
  });

  it('registrarAcao loga o evento e grava a interceptação do dia', async () => {
    const { result } = await renderHook(() =>
      useIntercept('uid-1', 'com.instagram.android'),
    );

    await act(async () => {
      result.current.registrarAcao('A', 'sessao');
    });

    expect(logInterceptAction).toHaveBeenCalledWith('sessao');
    await waitFor(() => expect(registrarInterceptacaoNoDia).toHaveBeenCalled());
    const [uidChamado, dataChamada, interceptacoes] =
      registrarInterceptacaoNoDia.mock.calls[0];
    expect(uidChamado).toBe('uid-1');
    expect(dataChamada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(interceptacoes).toEqual([
      expect.objectContaining({
        app: 'com.instagram.android',
        estadoTela: 'A',
        acao: 'sessao',
      }),
    ]);
  });

  it('acrescenta à lista de interceptações já existente no dia', async () => {
    buscarDailyLog.mockResolvedValue({
      data: '2026-09-24',
      tarefas: [],
      statusDia: 'pendente',
      escudoUsado: false,
      interceptacoes: [
        {
          app: 'com.whatsapp',
          hora: '2026-09-24T08:00:00.000Z',
          estadoTela: 'B',
          acao: 'liberou',
        },
      ],
    });

    const { result } = await renderHook(() =>
      useIntercept('uid-1', 'com.instagram.android'),
    );

    await act(async () => {
      result.current.registrarAcao('C', 'saiu');
    });

    await waitFor(() => expect(registrarInterceptacaoNoDia).toHaveBeenCalled());
    const [, , interceptacoes] = registrarInterceptacaoNoDia.mock.calls[0];
    expect(interceptacoes).toHaveLength(2);
    expect(interceptacoes[0].app).toBe('com.whatsapp');
  });

  it('falha ao gravar: não quebra, só registra o erro', async () => {
    registrarInterceptacaoNoDia.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() =>
      useIntercept('uid-1', 'com.instagram.android'),
    );

    await act(async () => {
      result.current.registrarAcao('A', 'saiu');
    });

    await waitFor(() =>
      expect(registrarErro).toHaveBeenCalledWith(
        expect.any(Error),
        'useIntercept.registrarAcao',
      ),
    );
  });
});
