import {
  PACOTES_REDES_SOCIAIS,
  appsIniciaisSelecionados,
  filtrarRedesSociaisInstaladas,
  nomeDoApp,
} from './redesSociais';

describe('lista curada de redes sociais', () => {
  it('CA-02: RN-01 tem exatamente os pacotes da spec', () => {
    expect([...PACOTES_REDES_SOCIAIS].sort()).toEqual(
      [
        'com.instagram.android',
        'com.zhiliaoapp.musically',
        'com.ss.android.ugc.trill',
        'com.kwai.video',
        'com.facebook.katana',
        'com.facebook.lite',
        'com.twitter.android',
        'com.instagram.barcelona',
        'com.reddit.frontpage',
        'com.pinterest',
        'com.snapchat.android',
        'com.google.android.youtube',
      ].sort(),
    );
  });

  it('CA-02: ignora apps instalados fora da lista curada', () => {
    const instalados = [
      { packageName: 'com.instagram.android', nome: 'Instagram' },
      { packageName: 'com.whatsapp', nome: 'WhatsApp' },
      { packageName: 'com.android.chrome', nome: 'Chrome' },
      { packageName: 'com.google.android.youtube', nome: 'YouTube' },
    ];

    expect(filtrarRedesSociaisInstaladas(instalados).map((a) => a.packageName)).toEqual([
      'com.instagram.android',
      'com.google.android.youtube',
    ]);
  });

  it('CA-02: sem nenhum app da lista devolve vazio', () => {
    expect(filtrarRedesSociaisInstaladas([{ packageName: 'com.whatsapp' }])).toEqual([]);
  });
});

describe('appsIniciaisSelecionados', () => {
  const instalados = [
    { packageName: 'com.instagram.android' },
    { packageName: 'com.zhiliaoapp.musically' },
    { packageName: 'com.google.android.youtube' },
  ];

  it('CA-01: primeira configuração marca tudo exceto o YouTube', () => {
    expect(appsIniciaisSelecionados(undefined, instalados)).toEqual([
      'com.instagram.android',
      'com.zhiliaoapp.musically',
    ]);
  });

  it('CA-03: regra salva mantém exatamente as marcações salvas', () => {
    const salvas = { apps: ['com.google.android.youtube'], janelas: [] };

    expect(appsIniciaisSelecionados(salvas, instalados)).toEqual(['com.google.android.youtube']);
  });

  it('CA-03: regra salva sem apps não pré-marca nada', () => {
    expect(appsIniciaisSelecionados({ apps: [], janelas: [] }, instalados)).toEqual([]);
  });
});

describe('HU-08 · nomeDoApp', () => {
  it('Cenário 7: agrupa os 2 pacotes do TikTok sob o mesmo nome', () => {
    expect(nomeDoApp('com.zhiliaoapp.musically')).toBe('TikTok');
    expect(nomeDoApp('com.ss.android.ugc.trill')).toBe('TikTok');
  });

  it('Cenário 7: agrupa Facebook e Facebook Lite sob o mesmo nome', () => {
    expect(nomeDoApp('com.facebook.katana')).toBe('Facebook');
    expect(nomeDoApp('com.facebook.lite')).toBe('Facebook');
  });

  it('dá o nome certo pros demais pacotes da lista curada', () => {
    expect(nomeDoApp('com.instagram.android')).toBe('Instagram');
    expect(nomeDoApp('com.instagram.barcelona')).toBe('Threads');
    expect(nomeDoApp('com.twitter.android')).toBe('X');
    expect(nomeDoApp('com.kwai.video')).toBe('Kwai');
    expect(nomeDoApp('com.reddit.frontpage')).toBe('Reddit');
    expect(nomeDoApp('com.pinterest')).toBe('Pinterest');
    expect(nomeDoApp('com.snapchat.android')).toBe('Snapchat');
    expect(nomeDoApp('com.google.android.youtube')).toBe('YouTube');
  });

  it('pacote fora da lista curada devolve o próprio pacote', () => {
    expect(nomeDoApp('com.whatsapp')).toBe('com.whatsapp');
  });
});
