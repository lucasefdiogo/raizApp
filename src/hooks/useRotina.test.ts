import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRotina } from './useRotina';
import { dataDeAmanhaLocal, hojeISOLocal } from '../domain/data';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('../services/analytics');
jest.mock('../native/AccessibilityDetection');
jest.mock('./useToast');
jest.mock('../utils/storage', () => ({
  ...jest.requireActual('../utils/storage'),
  lerItem: jest.fn(),
  salvarItem: jest.fn(),
}));

const {
  buscarUsuario,
  buscarUltimosDailyLogs,
  confirmarRotina,
  salvarAlternativaNoturna,
  editarHorarioRotinaManual,
  recalcularRotinaAutomatica,
  aplicarEstimativaRotina,
} = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');
const {
  logRotinaConfirmada,
  logAlternativaNoturnaRespondida,
  logRotinaRecalculoPedido,
} = require('../services/analytics');
const { salvarRotina } = require('../native/AccessibilityDetection');
const { useToast } = require('./useToast');
const { lerItem, salvarItem, STORAGE_KEYS } = require('../utils/storage');

const showToast = jest.fn();

function dia(n: number, primeiro: string, ultimo: string) {
  const d = String(n).padStart(2, '0');
  return {
    data: `2026-10-${d}`,
    tarefas: [],
    statusDia: 'pendente',
    escudoUsado: false,
    usoApps: {
      'com.instagram.android': { segundos: 60, aberturas: 1 },
      primeiroUsoDia: `2026-10-${d}T${primeiro}:00`,
      ultimoUsoAntesPausaLonga: `2026-10-${d}T${ultimo}:00`,
    },
  };
}

function logs(qtd: number) {
  return Array.from({ length: qtd }, (_, i) => dia(i + 1, '07:00', '23:00'));
}

const ESTIMATIVA = { dormirEstimado: '23:00', acordarEstimado: '07:00' };

describe('useRotina', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useToast.mockReturnValue({ showToast });
    buscarUsuario.mockResolvedValue({});
    confirmarRotina.mockResolvedValue(undefined);
    salvarAlternativaNoturna.mockResolvedValue(undefined);
    editarHorarioRotinaManual.mockResolvedValue(undefined);
    recalcularRotinaAutomatica.mockResolvedValue(undefined);
    aplicarEstimativaRotina.mockResolvedValue(undefined);
    lerItem.mockResolvedValue(null);
    salvarItem.mockResolvedValue(undefined);
  });

  async function montar() {
    const hook = await renderHook(() => useRotina('uid-1'));
    await waitFor(() => expect(hook.result.current.carregando).toBe(false));
    return hook;
  }

  it('CA-01: com 5 dias de dados e sem confirmadoEm pede a tela de confirmação', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));

    const { result } = await montar();

    expect(result.current.estimativa).toEqual(ESTIMATIVA);
    expect(result.current.mostrarConfirmacao).toBe(true);
  });

  it('CA-01: com rotina já confirmada não pede a tela de confirmação', async () => {
    buscarUsuario.mockResolvedValue({
      rotina: { ...ESTIMATIVA, confirmadoEm: '2026-10-10' },
    });
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));

    const { result } = await montar();

    expect(result.current.mostrarConfirmacao).toBe(false);
  });

  it('CA-02: confirmar grava confirmadoEm e pede a pergunta da alternativa', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();
    expect(result.current.perguntarAlternativa).toBe(false);

    await act(async () => {
      await result.current.confirmar();
    });

    expect(confirmarRotina).toHaveBeenCalledWith(
      'uid-1',
      ESTIMATIVA,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
      false,
    );
    expect(result.current.mostrarConfirmacao).toBe(false);
    expect(result.current.perguntarAlternativa).toBe(true);
  });

  it('CA-02: confirmar com horários ajustados grava os ajustados', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();
    const ajustados = { dormirEstimado: '22:30', acordarEstimado: '06:30' };

    await act(async () => {
      await result.current.confirmar(ajustados);
    });

    expect(confirmarRotina).toHaveBeenCalledWith(
      'uid-1',
      ajustados,
      expect.any(String),
      true,
    );
  });

  it('HU-10 RN06: confirmar sem ajuste atualiza o estado local com modoManual falso', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();

    await act(async () => {
      await result.current.confirmar();
    });

    expect(result.current.rotina?.modoManual).toBe(false);
  });

  it('HU-10 RN07: confirmar com ajuste atualiza o estado local com modoManual verdadeiro', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();
    const ajustados = { dormirEstimado: '22:30', acordarEstimado: '06:30' };

    await act(async () => {
      await result.current.confirmar(ajustados);
    });

    expect(result.current.rotina?.modoManual).toBe(true);
  });

  it('CA-02: falha ao gravar mostra toast sem exclamação e não avança', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    confirmarRotina.mockRejectedValue(new Error('offline'));
    const { result } = await montar();

    await act(async () => {
      await result.current.confirmar();
    });

    expect(registrarErro).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0][0]).not.toContain('!');
    expect(result.current.mostrarConfirmacao).toBe(true);
    expect(result.current.perguntarAlternativa).toBe(false);
  });

  it('CA-03: responder grava a alternativa e Agora não não grava nada', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();
    await act(async () => {
      await result.current.confirmar();
    });

    await act(async () => {
      await result.current.salvarAlternativa('ler um livro');
    });

    expect(salvarAlternativaNoturna).toHaveBeenCalledWith(
      'uid-1',
      'ler um livro',
    );
    expect(result.current.perguntarAlternativa).toBe(false);
  });

  it('CA-03: Agora não encerra a pergunta sem gravar nada', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();
    await act(async () => {
      await result.current.confirmar();
    });
    expect(result.current.perguntarAlternativa).toBe(true);

    await act(async () => {
      result.current.dispensarAlternativa();
    });

    expect(result.current.perguntarAlternativa).toBe(false);
    expect(salvarAlternativaNoturna).not.toHaveBeenCalled();
  });

  it('CA-07: com menos de 5 dias não pede a tela de confirmação', async () => {
    buscarUltimosDailyLogs.mockResolvedValue(logs(4));

    const { result } = await montar();

    expect(result.current.estimativa).toBeNull();
    expect(result.current.mostrarConfirmacao).toBe(false);
  });

  it('CA-07: dias sem os campos de horário não contam', async () => {
    buscarUltimosDailyLogs.mockResolvedValue([
      ...logs(4),
      {
        data: '2026-10-05',
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
      },
    ]);

    const { result } = await montar();

    expect(result.current.mostrarConfirmacao).toBe(false);
  });

  it('HU-09 RN11: diasComDados conta só os dias com os dois horários', async () => {
    buscarUltimosDailyLogs.mockResolvedValue([
      ...logs(3),
      {
        data: '2026-10-05',
        tarefas: [],
        statusDia: 'pendente',
        escudoUsado: false,
      },
    ]);

    const { result } = await montar();

    expect(result.current.diasComDados).toBe(3);
  });

  it('CA-08: editar o horário de dormir ativa modoManual e a estimativa não o sobrescreve', async () => {
    buscarUsuario.mockResolvedValue({
      rotina: { ...ESTIMATIVA, confirmadoEm: '2026-10-10' },
    });
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();

    await act(async () => {
      await result.current.editarHorarioManual({ dormirEstimado: '01:00' });
    });

    expect(editarHorarioRotinaManual).toHaveBeenCalledWith('uid-1', {
      dormirEstimado: '01:00',
    });
    expect(result.current.rotina?.modoManual).toBe(true);
    expect(result.current.rotina?.dormirEstimado).toBe('01:00');
    expect(result.current.estimativa).toBeNull();
  });

  it('CA-08: recalcularAutomaticamente limpa modoManual e a estimativa volta', async () => {
    buscarUsuario.mockResolvedValue({
      rotina: {
        dormirEstimado: '01:00',
        acordarEstimado: '07:00',
        confirmadoEm: '2026-10-10',
        modoManual: true,
      },
    });
    buscarUltimosDailyLogs.mockResolvedValue(logs(5));
    const { result } = await montar();
    expect(result.current.estimativa).toBeNull();

    await act(async () => {
      await result.current.recalcularAutomaticamente();
    });

    expect(recalcularRotinaAutomatica).toHaveBeenCalledWith('uid-1');
    expect(result.current.rotina?.modoManual).toBe(false);
    expect(result.current.estimativa).toEqual(ESTIMATIVA);
  });

  describe('HU-10 RN16/RN18: espelho nativo e Analytics', () => {
    it('Cenário 5: confirmar sem ajuste espelha a rotina e registra ajustado falso', async () => {
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));
      const { result } = await montar();

      await act(async () => {
        await result.current.confirmar();
      });

      expect(logRotinaConfirmada).toHaveBeenCalledWith(false);
      expect(salvarRotina).toHaveBeenCalledWith(
        expect.objectContaining({ ...ESTIMATIVA, modoManual: false }),
      );
    });

    it('Cenário 6: confirmar com ajuste registra ajustado verdadeiro', async () => {
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));
      const { result } = await montar();
      const ajustados = { dormirEstimado: '22:30', acordarEstimado: '06:30' };

      await act(async () => {
        await result.current.confirmar(ajustados);
      });

      expect(logRotinaConfirmada).toHaveBeenCalledWith(true);
    });

    it('Cenário 9: salvarAlternativa registra "salvou" e espelha a rotina', async () => {
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));
      const { result } = await montar();
      await act(async () => {
        await result.current.confirmar();
      });
      salvarRotina.mockClear();

      await act(async () => {
        await result.current.salvarAlternativa('Ler um pouco');
      });

      expect(logAlternativaNoturnaRespondida).toHaveBeenCalledWith('salvou');
      expect(salvarRotina).toHaveBeenCalledWith(
        expect.objectContaining({ alternativaNoturna: 'Ler um pouco' }),
      );
    });

    it('Cenário 10: dispensarAlternativa (Agora não) registra "agora_nao"', async () => {
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));
      const { result } = await montar();
      await act(async () => {
        await result.current.confirmar();
      });

      await act(async () => {
        result.current.dispensarAlternativa();
      });

      expect(logAlternativaNoturnaRespondida).toHaveBeenCalledWith('agora_nao');
    });

    it('RN15: Recalcular automaticamente registra o pedido e mostra o toast', async () => {
      buscarUsuario.mockResolvedValue({
        rotina: { ...ESTIMATIVA, confirmadoEm: '2026-10-10', modoManual: true },
      });
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));
      const { result } = await montar();

      await act(async () => {
        await result.current.recalcularAutomaticamente();
      });

      expect(logRotinaRecalculoPedido).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(
        'Na próxima abertura, o horário volta a ser estimado.',
      );
    });

    it('RN16: sem confirmadoEm, editarHorarioManual não espelha nada no nativo', async () => {
      buscarUsuario.mockResolvedValue({ rotina: null });
      buscarUltimosDailyLogs.mockResolvedValue(logs(4));
      const { result } = await montar();

      await act(async () => {
        await result.current.editarHorarioManual({ dormirEstimado: '23:00' });
      });

      expect(salvarRotina).not.toHaveBeenCalled();
    });
  });

  describe('HU-10 RN09: adiar a confirmação pro dia seguinte', () => {
    it('Cenário 8: adiar grava a data de amanhã e esconde a confirmação na hora', async () => {
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));
      const { result } = await montar();
      expect(result.current.mostrarConfirmacao).toBe(true);

      await act(async () => {
        result.current.adiar();
      });

      expect(salvarItem).toHaveBeenCalledWith(
        STORAGE_KEYS.rotinaConfirmacaoAdiada,
        dataDeAmanhaLocal(hojeISOLocal()),
      );
      expect(result.current.mostrarConfirmacao).toBe(false);
    });

    it('Cenário 8: adiada pra uma data futura, a confirmação não aparece mesmo com estimativa', async () => {
      const amanha = dataDeAmanhaLocal(hojeISOLocal());
      lerItem.mockImplementation((chave: string) =>
        Promise.resolve(chave === STORAGE_KEYS.rotinaConfirmacaoAdiada ? amanha : null),
      );
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));

      const { result } = await montar();

      expect(result.current.mostrarConfirmacao).toBe(false);
    });

    it('a confirmação volta a aparecer quando a data adiada já passou', async () => {
      lerItem.mockImplementation((chave: string) =>
        Promise.resolve(chave === STORAGE_KEYS.rotinaConfirmacaoAdiada ? '2020-01-01' : null),
      );
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));

      const { result } = await montar();

      expect(result.current.mostrarConfirmacao).toBe(true);
    });
  });

  describe('HU-10 RN15: aplica a estimativa uma vez após "Recalcular automaticamente"', () => {
    it('Cenário 15: com o recálculo pendente e estimativa nova, atualiza os horários mantendo confirmadoEm', async () => {
      lerItem.mockImplementation((chave: string) =>
        Promise.resolve(chave === STORAGE_KEYS.rotinaRecalculoPendente ? true : null),
      );
      buscarUsuario.mockResolvedValue({
        rotina: {
          dormirEstimado: '01:00',
          acordarEstimado: '09:00',
          confirmadoEm: '2026-10-10',
          modoManual: false,
        },
      });
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));

      const { result } = await montar();

      await waitFor(() => expect(aplicarEstimativaRotina).toHaveBeenCalled());
      expect(aplicarEstimativaRotina).toHaveBeenCalledWith('uid-1', ESTIMATIVA);
      await waitFor(() =>
        expect(result.current.rotina).toEqual({
          dormirEstimado: ESTIMATIVA.dormirEstimado,
          acordarEstimado: ESTIMATIVA.acordarEstimado,
          confirmadoEm: '2026-10-10',
          modoManual: false,
        }),
      );
      expect(salvarItem).toHaveBeenCalledWith(STORAGE_KEYS.rotinaRecalculoPendente, false);
      expect(result.current.mostrarConfirmacao).toBe(false);
    });

    it('sem o recálculo pendente, a estimativa nova não sobrescreve a rotina confirmada', async () => {
      buscarUsuario.mockResolvedValue({
        rotina: {
          dormirEstimado: '01:00',
          acordarEstimado: '09:00',
          confirmadoEm: '2026-10-10',
          modoManual: false,
        },
      });
      buscarUltimosDailyLogs.mockResolvedValue(logs(5));

      const { result } = await montar();

      expect(aplicarEstimativaRotina).not.toHaveBeenCalled();
      expect(result.current.rotina?.dormirEstimado).toBe('01:00');
    });
  });
});
