import {
  PACOTES_REDES_SOCIAIS,
  appsIniciaisSelecionados,
  filtrarRedesSociaisInstaladas,
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
