import { PACOTES_REDES_SOCIAIS } from '../domain/redesSociais';

// O projeto não tem @types/node: `require` devolve any, e o Jest roda da raiz do repositório.
const fs = require('fs');

const manifesto: string = fs
  .readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  // Comentários explicam o porquê e citam o que NÃO se usa; só o XML ativo conta.
  .replace(/<!--[\s\S]*?-->/g, '');

describe('AndroidManifest permissões', () => {
  it('CA-06: manifesto declara PACKAGE_USAGE_STATS', () => {
    expect(manifesto).toMatch(
      /<uses-permission[^>]*android:name="android\.permission\.PACKAGE_USAGE_STATS"/,
    );
  });
});

describe('AndroidManifest <queries>', () => {
  const blocoQueries =
    manifesto.match(/<queries>([\s\S]*?)<\/queries>/)?.[1] ?? '';

  it('CA-02: manifesto declara exatamente os pacotes da lista curada', () => {
    const declarados = [
      ...blocoQueries.matchAll(/<package\s+android:name="([^"]+)"\s*\/>/g),
    ].map(m => m[1]);

    expect([...declarados].sort()).toEqual([...PACOTES_REDES_SOCIAIS].sort());
  });

  it('CA-02: sem consulta MAIN/LAUNCHER nem QUERY_ALL_PACKAGES', () => {
    expect(blocoQueries).not.toContain('<intent>');
    expect(blocoQueries).not.toContain('LAUNCHER');
    expect(manifesto).not.toContain('QUERY_ALL_PACKAGES');
  });
});

describe('AndroidManifest aviso de bloqueio desligado (HU-03)', () => {
  const receiver = (nome: string): string =>
    manifesto.match(
      new RegExp(`<receiver[^>]*android:name="\\.${nome}"[\\s\\S]*?(?:/>|</receiver>)`),
    )?.[0] ?? '';

  it('CA-01: manifesto declara o receiver do lembrete e RECEIVE_BOOT_COMPLETED', () => {
    expect(receiver('AvisoDesligamentoReceiver')).not.toBe('');
    expect(manifesto).toMatch(
      /<uses-permission[^>]*android:name="android\.permission\.RECEIVE_BOOT_COMPLETED"/,
    );
    const boot = receiver('AvisoDesligamentoBootReceiver');
    expect(boot).toContain('android.intent.action.BOOT_COMPLETED');
  });

  it('CA-06: o receiver do lembrete não é exportado', () => {
    const lembrete = receiver('AvisoDesligamentoReceiver');
    expect(lembrete).toContain('android:exported="false"');
    expect(lembrete).not.toContain('<intent-filter');
    // Boot receiver also stays private: BOOT_COMPLETED is a protected system broadcast.
    expect(receiver('AvisoDesligamentoBootReceiver')).toContain('android:exported="false"');
  });
});
