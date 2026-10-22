import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRotina } from './useRotina';

jest.mock('../services/firestore');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const {
  buscarUsuario,
  buscarUltimosDailyLogs,
  confirmarRotina,
  salvarAlternativaNoturna,
  editarHorarioRotinaManual,
  recalcularRotinaAutomatica,
} = require('../services/firestore');
const { registrarErro } = require('../services/crashlytics');
const { useToast } = require('./useToast');

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
    );
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
});
