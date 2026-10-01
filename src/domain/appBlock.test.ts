import { aplicarRegrasBloqueioPendentesSeVencidas } from './appBlock';
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
