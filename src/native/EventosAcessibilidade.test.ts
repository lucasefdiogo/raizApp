import { NativeModules } from 'react-native';
import {
  espelharNotificacoesAtivas,
  lerEventosAcessibilidadePendentes,
  marcarEventosAcessibilidadeEnviados,
  verificarDesligamentoNaAbertura,
} from './EventosAcessibilidade';

const moduloMock = {
  lerEventosAcessibilidadePendentes: jest.fn(),
  marcarEventosAcessibilidadeEnviados: jest.fn(),
  verificarDesligamentoNaAbertura: jest.fn(),
  espelharNotificacoesAtivas: jest.fn(),
};

describe('EventosAcessibilidade (wrapper nativo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NativeModules as Record<string, unknown>).RootoraAccessibility =
      moduloMock;
  });

  afterEach(() => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
  });

  it('CA-05: sem o módulo nativo nenhum evento pendente é devolvido', async () => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;

    await expect(lerEventosAcessibilidadePendentes()).resolves.toEqual([]);
    await expect(
      marcarEventosAcessibilidadeEnviados(['a']),
    ).resolves.toBeUndefined();
  });

  it('CA-05: com o módulo nativo devolve os pendentes e repassa os ids enviados', async () => {
    const eventos = [
      { id: 'e1', tipo: 'desligamento', em: '2026-10-20T10:00:00.000Z' },
      { id: 'e2', tipo: 'religamento', em: '2026-10-20T11:00:00.000Z' },
    ];
    moduloMock.lerEventosAcessibilidadePendentes.mockResolvedValue(eventos);
    moduloMock.marcarEventosAcessibilidadeEnviados.mockResolvedValue(undefined);

    await expect(lerEventosAcessibilidadePendentes()).resolves.toEqual(eventos);
    await marcarEventosAcessibilidadeEnviados(['e1', 'e2']);
    expect(moduloMock.marcarEventosAcessibilidadeEnviados).toHaveBeenCalledWith(
      ['e1', 'e2'],
    );
  });

  it('CA-07: sem o módulo nativo a verificação na abertura não lança', async () => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;

    await expect(verificarDesligamentoNaAbertura()).resolves.toBeUndefined();
  });

  it('CA-07: com o módulo nativo a verificação na abertura é pedida ao nativo', async () => {
    moduloMock.verificarDesligamentoNaAbertura.mockResolvedValue(undefined);

    await verificarDesligamentoNaAbertura();
    expect(moduloMock.verificarDesligamentoNaAbertura).toHaveBeenCalledTimes(1);
  });

  it('CA-06: espelharNotificacoesAtivas repassa o valor ao módulo nativo', () => {
    espelharNotificacoesAtivas(false);
    espelharNotificacoesAtivas(true);

    expect(moduloMock.espelharNotificacoesAtivas).toHaveBeenNthCalledWith(
      1,
      false,
    );
    expect(moduloMock.espelharNotificacoesAtivas).toHaveBeenNthCalledWith(
      2,
      true,
    );
  });

  it('CA-06: sem o módulo nativo espelharNotificacoesAtivas não lança', () => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;

    expect(() => espelharNotificacoesAtivas(true)).not.toThrow();
  });
});
