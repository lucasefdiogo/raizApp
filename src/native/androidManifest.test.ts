import { PACOTES_REDES_SOCIAIS } from '../domain/redesSociais';

// O projeto não tem @types/node: `require` devolve any, e o Jest roda da raiz do repositório.
const fs = require('fs');

const manifesto: string = fs
  .readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  // Comentários explicam o porquê e citam o que NÃO se usa; só o XML ativo conta.
  .replace(/<!--[\s\S]*?-->/g, '');

describe('AndroidManifest <queries>', () => {
  const blocoQueries = manifesto.match(/<queries>([\s\S]*?)<\/queries>/)?.[1] ?? '';

  it('CA-02: manifesto declara exatamente os pacotes da lista curada', () => {
    const declarados = [...blocoQueries.matchAll(/<package\s+android:name="([^"]+)"\s*\/>/g)].map(
      (m) => m[1],
    );

    expect([...declarados].sort()).toEqual([...PACOTES_REDES_SOCIAIS].sort());
  });

  it('CA-02: sem consulta MAIN/LAUNCHER nem QUERY_ALL_PACKAGES', () => {
    expect(blocoQueries).not.toContain('<intent>');
    expect(blocoQueries).not.toContain('LAUNCHER');
    expect(manifesto).not.toContain('QUERY_ALL_PACKAGES');
  });
});
