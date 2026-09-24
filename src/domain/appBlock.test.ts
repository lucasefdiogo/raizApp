import {
  alternarAppNaSelecao,
  aplicarRegrasBloqueioPendentesSeVencidas,
  estaDentroDaJanelaDeHorario,
} from './appBlock';
import { RegrasBloqueio, RegrasBloqueioPendentes } from './types';

describe('alternarAppNaSelecao', () => {
  it('adiciona o package quando ainda não está selecionado', () => {
    expect(alternarAppNaSelecao([], 'com.instagram.android')).toEqual([
      'com.instagram.android',
    ]);
    expect(
      alternarAppNaSelecao(['com.zhiliaoapp.musically'], 'com.instagram.android'),
    ).toEqual(['com.zhiliaoapp.musically', 'com.instagram.android']);
  });

  it('remove o package quando já está selecionado', () => {
    expect(
      alternarAppNaSelecao(
        ['com.instagram.android', 'com.zhiliaoapp.musically'],
        'com.instagram.android',
      ),
    ).toEqual(['com.zhiliaoapp.musically']);
  });

  it('não muta o array recebido', () => {
    const original = ['com.instagram.android'];
    alternarAppNaSelecao(original, 'com.whatsapp');
    expect(original).toEqual(['com.instagram.android']);
  });
});

describe('estaDentroDaJanelaDeHorario', () => {
  function horas(h: number, m: number): Date {
    const data = new Date('2026-09-11T00:00:00');
    data.setHours(h, m, 0, 0);
    return data;
  }

  it('true quando o horário atual está dentro da janela', () => {
    expect(
      estaDentroDaJanelaDeHorario('09:00', '18:00', horas(12, 30)),
    ).toBe(true);
  });

  it('false quando ainda não chegou o horário de início', () => {
    expect(
      estaDentroDaJanelaDeHorario('09:00', '18:00', horas(8, 59)),
    ).toBe(false);
  });

  it('false quando já passou do horário de fim', () => {
    expect(
      estaDentroDaJanelaDeHorario('09:00', '18:00', horas(18, 1)),
    ).toBe(false);
  });

  it('true exatamente no início e exatamente no fim (limites inclusivos)', () => {
    expect(estaDentroDaJanelaDeHorario('09:00', '18:00', horas(9, 0))).toBe(
      true,
    );
    expect(estaDentroDaJanelaDeHorario('09:00', '18:00', horas(18, 0))).toBe(
      true,
    );
  });

  it('janela atravessando a meia-noite: true tanto à noite quanto de madrugada', () => {
    expect(
      estaDentroDaJanelaDeHorario('22:00', '06:00', horas(23, 30)),
    ).toBe(true);
    expect(estaDentroDaJanelaDeHorario('22:00', '06:00', horas(2, 0))).toBe(
      true,
    );
    expect(estaDentroDaJanelaDeHorario('22:00', '06:00', horas(12, 0))).toBe(
      false,
    );
  });

  it('false sem horário configurado (null)', () => {
    expect(estaDentroDaJanelaDeHorario(null, null, horas(12, 0))).toBe(false);
    expect(estaDentroDaJanelaDeHorario('09:00', null, horas(12, 0))).toBe(
      false,
    );
  });
});

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
