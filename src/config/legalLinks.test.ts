import {
  ROTULO_POLITICA_PRIVACIDADE,
  ROTULO_TERMOS_DE_USO,
  URL_POLITICA_PRIVACIDADE,
  URL_TERMOS_DE_USO,
} from './legalLinks';

describe('legalLinks', () => {
  it('expõe as duas URLs como HTTPS absolutas e distintas', () => {
    expect(URL_POLITICA_PRIVACIDADE).toMatch(/^https:\/\/.+/);
    expect(URL_TERMOS_DE_USO).toMatch(/^https:\/\/.+/);
    expect(URL_POLITICA_PRIVACIDADE).not.toBe(URL_TERMOS_DE_USO);
  });

  it('aponta para as rotas /privacidade e /termos do Hosting', () => {
    expect(URL_POLITICA_PRIVACIDADE.endsWith('/privacidade')).toBe(true);
    expect(URL_TERMOS_DE_USO.endsWith('/termos')).toBe(true);
  });

  it('expõe os rótulos exibidos ao usuário', () => {
    expect(ROTULO_POLITICA_PRIVACIDADE).toBe('Política de Privacidade');
    expect(ROTULO_TERMOS_DE_USO).toBe('Termos de Uso');
  });
});
