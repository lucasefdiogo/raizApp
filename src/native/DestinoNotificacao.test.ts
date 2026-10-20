import { NativeModules } from 'react-native';
import { consumirDestinoNotificacao } from './DestinoNotificacao';

describe('DestinoNotificacao (wrapper nativo)', () => {
  afterEach(() => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;
  });

  it('CA-04: sem o módulo nativo nenhum destino pendente é devolvido', async () => {
    delete (NativeModules as Record<string, unknown>).RootoraAccessibility;

    await expect(consumirDestinoNotificacao()).resolves.toBeNull();
  });

  it('CA-04: com o módulo nativo devolve o destino que ele consumiu', async () => {
    const consumir = jest.fn().mockResolvedValue('bloqueio-apps');
    (NativeModules as Record<string, unknown>).RootoraAccessibility = {
      consumirDestinoNotificacao: consumir,
    };

    await expect(consumirDestinoNotificacao()).resolves.toBe('bloqueio-apps');
    expect(consumir).toHaveBeenCalledTimes(1);
  });
});
