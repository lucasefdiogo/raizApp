import {
  aplicarRegrasBloqueioPendentesSeVencidas,
  decidirGravacaoRegrasBloqueio,
  formatarDiasSemana,
  janelaBloqueioValida,
  limparAppsForaDaListaCurada,
  mesmasRegrasBloqueio,
  resumoRegrasBloqueio,
} from './appBlock';
import { RegrasBloqueio, RegrasBloqueioPendentes } from './types';

describe('aplicarRegrasBloqueioPendentesSeVencidas', () => {
  const regrasAtuais: RegrasBloqueio = {
    apps: ['com.instagram.android', 'com.whatsapp'],
    janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
  };

  const pendentesQueAfrouxam: RegrasBloqueioPendentes = {
    apps: ['com.instagram.android'],
    janelas: [{ inicio: '09:00', fim: '17:00', diasSemana: [1, 2, 3, 4, 5] }],
    efetivaEm: '2026-09-25',
  };

  it('pendente vencida carrega os campos de config de bloco junto, sem efetivaEm', () => {
    const comConfig: RegrasBloqueioPendentes = {
      ...pendentesQueAfrouxam,
      cooldownMin: 10,
      blocosDiarios: 6,
    };
    const resultado = aplicarRegrasBloqueioPendentesSeVencidas(
      regrasAtuais,
      comConfig,
      '2026-09-25',
    );
    expect(resultado.regrasBloqueio).toEqual({
      apps: comConfig.apps,
      janelas: comConfig.janelas,
      cooldownMin: 10,
      blocosDiarios: 6,
    });
    expect(resultado.regrasBloqueio).not.toHaveProperty('efetivaEm');
  });

  it('sem pendência: devolve as regras atuais intocadas', () => {
    expect(
      aplicarRegrasBloqueioPendentesSeVencidas(
        regrasAtuais,
        null,
        '2026-09-24',
      ),
    ).toEqual({ regrasBloqueio: regrasAtuais, regrasBloqueioPendentes: null });
  });

  it('pendência ainda não vencida: mantém as atuais e a pendência', () => {
    expect(
      aplicarRegrasBloqueioPendentesSeVencidas(
        regrasAtuais,
        pendentesQueAfrouxam,
        '2026-09-24',
      ),
    ).toEqual({
      regrasBloqueio: regrasAtuais,
      regrasBloqueioPendentes: pendentesQueAfrouxam,
    });
  });

  it('pendência vence exatamente em efetivaEm: promove e limpa a pendência', () => {
    expect(
      aplicarRegrasBloqueioPendentesSeVencidas(
        regrasAtuais,
        pendentesQueAfrouxam,
        '2026-09-25',
      ),
    ).toEqual({
      regrasBloqueio: {
        apps: pendentesQueAfrouxam.apps,
        janelas: pendentesQueAfrouxam.janelas,
      },
      regrasBloqueioPendentes: null,
    });
  });

  it('pendência já vencida há dias: também promove', () => {
    expect(
      aplicarRegrasBloqueioPendentesSeVencidas(
        regrasAtuais,
        pendentesQueAfrouxam,
        '2026-10-01',
      ).regrasBloqueioPendentes,
    ).toBeNull();
  });
});

describe('janelaBloqueioValida', () => {
  it('true quando fim é depois do início', () => {
    expect(janelaBloqueioValida('09:00', '18:00')).toBe(true);
  });

  it('false quando fim é igual ao início', () => {
    expect(janelaBloqueioValida('09:00', '09:00')).toBe(false);
  });

  it('false quando fim é antes do início (não cobre virada de meia-noite nesta versão)', () => {
    expect(janelaBloqueioValida('22:00', '06:00')).toBe(false);
  });

  it('false com horário mal formado', () => {
    expect(janelaBloqueioValida('9h', '18:00')).toBe(false);
  });
});

describe('formatarDiasSemana', () => {
  it('lista os dias abreviados em ordem', () => {
    expect(formatarDiasSemana([3, 1, 5])).toBe('seg, qua, sex');
  });

  it('todos os 7 dias vira "todos os dias"', () => {
    expect(formatarDiasSemana([0, 1, 2, 3, 4, 5, 6])).toBe('todos os dias');
  });

  it('lista vazia vira "nenhum dia"', () => {
    expect(formatarDiasSemana([])).toBe('nenhum dia');
  });
});

describe('resumoRegrasBloqueio', () => {
  it('sem apps selecionados', () => {
    expect(resumoRegrasBloqueio({ apps: [], janelas: [] })).toBe(
      'Nenhum app bloqueado.',
    );
  });

  it('com apps e janela', () => {
    expect(
      resumoRegrasBloqueio({
        apps: ['com.instagram.android'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
      }),
    ).toBe('1 app selecionado, seg, ter, qua, qui, sex das 09:00 às 18:00.');
  });

  it('plural quando mais de um app', () => {
    expect(
      resumoRegrasBloqueio({
        apps: ['com.instagram.android', 'com.whatsapp'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [0] }],
      }),
    ).toBe('2 apps selecionados, dom das 09:00 às 18:00.');
  });

  it('apps sem janela definida', () => {
    expect(
      resumoRegrasBloqueio({ apps: ['com.instagram.android'], janelas: [] }),
    ).toBe('1 app selecionado, sem janela de horário definida.');
  });
});

describe('decidirGravacaoRegrasBloqueio', () => {
  const novasRegras: RegrasBloqueio = {
    apps: ['com.instagram.android'],
    janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
  };

  it('sem regrasBloqueio configurado ainda: imediata', () => {
    expect(decidirGravacaoRegrasBloqueio(undefined, novasRegras, '2026-09-24')).toEqual({
      tipo: 'imediata',
      regras: novasRegras,
    });
  });

  it('null também conta como "nunca configurado": imediata', () => {
    expect(decidirGravacaoRegrasBloqueio(null, novasRegras, '2026-09-24')).toEqual({
      tipo: 'imediata',
      regras: novasRegras,
    });
  });

  it('já existe regrasBloqueio: vira pendente pra amanhã', () => {
    const atuais: RegrasBloqueio = { apps: ['com.whatsapp'], janelas: [] };
    expect(decidirGravacaoRegrasBloqueio(atuais, novasRegras, '2026-09-24')).toEqual({
      tipo: 'pendente',
      pendente: { ...novasRegras, efetivaEm: '2026-09-25' },
    });
  });

  it('alteração de apps/janelas preserva a config de bloco das regras vigentes', () => {
    const atuais: RegrasBloqueio = {
      apps: ['com.whatsapp'],
      janelas: [],
      duracaoBlocoMin: 20,
      toleranciaMin: 1,
    };
    expect(decidirGravacaoRegrasBloqueio(atuais, novasRegras, '2026-09-24')).toEqual({
      tipo: 'pendente',
      pendente: {
        ...novasRegras,
        duracaoBlocoMin: 20,
        toleranciaMin: 1,
        efetivaEm: '2026-09-25',
      },
    });
  });

  it('desativar o bloqueio (novas regras vazias) também vira pendente — não classifica o tipo de mudança', () => {
    const atuais: RegrasBloqueio = { apps: ['com.whatsapp'], janelas: [] };
    const desativando: RegrasBloqueio = { apps: [], janelas: [] };
    expect(decidirGravacaoRegrasBloqueio(atuais, desativando, '2026-09-24')).toEqual({
      tipo: 'pendente',
      pendente: { ...desativando, efetivaEm: '2026-09-25' },
    });
  });

  it('respeita virada de mês/ano ao calcular efetivaEm', () => {
    const atuais: RegrasBloqueio = { apps: ['com.whatsapp'], janelas: [] };
    expect(decidirGravacaoRegrasBloqueio(atuais, novasRegras, '2026-12-31')).toEqual({
      tipo: 'pendente',
      pendente: { ...novasRegras, efetivaEm: '2027-01-01' },
    });
  });
});

describe('limparAppsForaDaListaCurada', () => {
  const janelas = [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }];

  it('CA-05: remove app fora da lista da regra e mantém a pendência nula', () => {
    const vigente: RegrasBloqueio = {
      apps: ['com.instagram.android', 'com.android.chrome'],
      janelas,
    };

    const limpo = limparAppsForaDaListaCurada(vigente, null);

    expect(limpo.regrasBloqueio).toEqual({ apps: ['com.instagram.android'], janelas });
    expect(limpo.regrasBloqueioPendentes).toBeNull();
    expect(limpo.mudou).toBe(true);
  });

  it('CA-05: remove app fora da lista também da pendente, preservando efetivaEm e janelas', () => {
    const vigente: RegrasBloqueio = { apps: ['com.instagram.android'], janelas };
    const pendente: RegrasBloqueioPendentes = {
      apps: ['com.instagram.android', 'com.whatsapp'],
      janelas,
      efetivaEm: '2026-09-25',
    };

    const limpo = limparAppsForaDaListaCurada(vigente, pendente);

    expect(limpo.regrasBloqueio).toEqual(vigente);
    expect(limpo.regrasBloqueioPendentes).toEqual({
      apps: ['com.instagram.android'],
      janelas,
      efetivaEm: '2026-09-25',
    });
    expect(limpo.mudou).toBe(true);
  });

  it('CA-05: limpeza repetida sobre regra limpa não pede gravação', () => {
    const vigente: RegrasBloqueio = {
      apps: ['com.instagram.android', 'com.android.chrome'],
      janelas,
    };
    const primeira = limparAppsForaDaListaCurada(vigente, null);

    const segunda = limparAppsForaDaListaCurada(
      primeira.regrasBloqueio,
      primeira.regrasBloqueioPendentes,
    );

    expect(segunda.mudou).toBe(false);
    expect(segunda.regrasBloqueio).toEqual(primeira.regrasBloqueio);
  });

  it('CA-05: regra só com apps da lista curada não muda', () => {
    const vigente: RegrasBloqueio = {
      apps: ['com.instagram.android', 'com.google.android.youtube'],
      janelas,
    };

    expect(limparAppsForaDaListaCurada(vigente, null).mudou).toBe(false);
  });
});

describe('mesmasRegrasBloqueio', () => {
  const base: RegrasBloqueio = {
    apps: ['com.instagram.android', 'com.whatsapp'],
    janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3] }],
  };

  it('considera iguais as mesmas regras com apps e dias em outra ordem', () => {
    expect(
      mesmasRegrasBloqueio(base, {
        apps: ['com.whatsapp', 'com.instagram.android'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [3, 1, 2] }],
      }),
    ).toBe(true);
  });

  it('ignora o que não é apps/janelas (config de blocos, efetivaEm)', () => {
    const pendente: RegrasBloqueioPendentes = {
      ...base,
      cooldownMin: 30,
      efetivaEm: '2026-10-23',
    };

    expect(mesmasRegrasBloqueio(pendente, base)).toBe(true);
  });

  it('detecta app marcado ou desmarcado', () => {
    expect(mesmasRegrasBloqueio(base, { ...base, apps: ['com.whatsapp'] })).toBe(false);
    expect(
      mesmasRegrasBloqueio(base, { ...base, apps: [...base.apps, 'com.zhiliaoapp.musically'] }),
    ).toBe(false);
  });

  it('detecta horário diferente', () => {
    expect(
      mesmasRegrasBloqueio(base, {
        ...base,
        janelas: [{ inicio: '09:00', fim: '17:00', diasSemana: [1, 2, 3] }],
      }),
    ).toBe(false);
  });

  it('detecta dias da semana diferentes', () => {
    expect(
      mesmasRegrasBloqueio(base, {
        ...base,
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2] }],
      }),
    ).toBe(false);
  });

  it('detecta janela adicionada ou removida', () => {
    expect(mesmasRegrasBloqueio(base, { ...base, janelas: [] })).toBe(false);
  });
});
