import { NativeModules } from 'react-native';
import {
  abrirConfiguracoesAcessoUso,
  lerEventosUso,
  temAcessoUso,
} from './UsoApps';

const moduloMock = {
  temAcessoUso: jest.fn(),
  abrirConfiguracoesAcessoUso: jest.fn(),
  lerEventosUso: jest.fn(),
};

describe('UsoApps (wrapper nativo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NativeModules as Record<string, unknown>).RootoraUsoApps = moduloMock;
  });

  afterEach(() => {
    delete (NativeModules as Record<string, unknown>).RootoraUsoApps;
  });

  it('CA-06: sem o módulo nativo o acesso de uso é falso e nenhum evento é devolvido', async () => {
    delete (NativeModules as Record<string, unknown>).RootoraUsoApps;

    await expect(temAcessoUso()).resolves.toBe(false);
    await expect(lerEventosUso(0, 1000)).resolves.toEqual([]);
    expect(() => abrirConfiguracoesAcessoUso()).not.toThrow();
  });

  it('CA-06: com o módulo nativo repassa acesso, configurações e eventos', async () => {
    const eventos = [
      {
        pacote: 'com.instagram.android',
        classe: 'A',
        tipo: 'primeiro_plano',
        ts: 5,
      },
    ];
    moduloMock.temAcessoUso.mockResolvedValue(true);
    moduloMock.lerEventosUso.mockResolvedValue(eventos);

    await expect(temAcessoUso()).resolves.toBe(true);
    await expect(lerEventosUso(1, 9)).resolves.toEqual(eventos);
    expect(moduloMock.lerEventosUso).toHaveBeenCalledWith(1, 9);
    abrirConfiguracoesAcessoUso();
    expect(moduloMock.abrirConfiguracoesAcessoUso).toHaveBeenCalledTimes(1);
  });
});
