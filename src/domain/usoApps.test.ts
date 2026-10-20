import { agregarUsoPorDia, EventoUso } from './usoApps';

const INSTAGRAM = 'com.instagram.android';
const TIKTOK = 'com.zhiliaoapp.musically';
const CHROME = 'com.android.chrome';
const LAUNCHER = 'com.android.launcher';

const ts = (dia: number, hora: number, min = 0, seg = 0) =>
  new Date(2026, 9, dia, hora, min, seg).getTime();

const entra = (pacote: string, t: number, classe = 'Main'): EventoUso => ({
  pacote,
  classe,
  tipo: 'primeiro_plano',
  ts: t,
});
const sai = (pacote: string, t: number, classe = 'Main'): EventoUso => ({
  pacote,
  classe,
  tipo: 'segundo_plano',
  ts: t,
});

const JANELA_INICIO = ts(12, 0);
const JANELA_FIM = ts(19, 23, 59);

describe('agregarUsoPorDia', () => {
  it('CA-01: 3 aberturas somando 20 minutos viram { segundos: 1200, aberturas: 3 }', () => {
    const eventos = [
      entra(INSTAGRAM, ts(19, 9, 0)),
      sai(INSTAGRAM, ts(19, 9, 5)),
      entra(LAUNCHER, ts(19, 9, 5), 'Home'),
      sai(LAUNCHER, ts(19, 12, 0), 'Home'),
      entra(INSTAGRAM, ts(19, 12, 0)),
      sai(INSTAGRAM, ts(19, 12, 10)),
      entra(CHROME, ts(19, 12, 10)),
      sai(CHROME, ts(19, 15, 0)),
      entra(INSTAGRAM, ts(19, 15, 0)),
      sai(INSTAGRAM, ts(19, 15, 5)),
    ];
    const r = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(r['2026-10-19'][INSTAGRAM]).toEqual({ segundos: 1200, aberturas: 3 });
  });

  it('CA-01: trocar de tela dentro do mesmo app não conta nova abertura (RN-03)', () => {
    const eventos = [
      entra(INSTAGRAM, ts(19, 9, 0), 'Feed'),
      sai(INSTAGRAM, ts(19, 9, 2), 'Feed'),
      entra(INSTAGRAM, ts(19, 9, 2), 'Perfil'),
      sai(INSTAGRAM, ts(19, 9, 6), 'Perfil'),
    ];
    const r = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(r['2026-10-19'][INSTAGRAM]).toEqual({ segundos: 360, aberturas: 1 });
  });

  it('CA-01: voltar ao app depois de outro app conta nova abertura', () => {
    const eventos = [
      entra(INSTAGRAM, ts(19, 9, 0)),
      sai(INSTAGRAM, ts(19, 9, 1)),
      entra(TIKTOK, ts(19, 9, 1)),
      sai(TIKTOK, ts(19, 9, 2)),
      entra(INSTAGRAM, ts(19, 9, 2)),
      sai(INSTAGRAM, ts(19, 9, 3)),
    ];
    const r = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(r['2026-10-19'][INSTAGRAM]).toEqual({ segundos: 120, aberturas: 2 });
    expect(r['2026-10-19'][TIKTOK]).toEqual({ segundos: 60, aberturas: 1 });
  });

  it('CA-01: uso que cruza a meia-noite é dividido entre os dois dias', () => {
    const eventos = [entra(INSTAGRAM, ts(18, 23, 50)), sai(INSTAGRAM, ts(19, 0, 20))];
    const r = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(r['2026-10-18'][INSTAGRAM]).toEqual({ segundos: 600, aberturas: 1 });
    expect(r['2026-10-19'][INSTAGRAM]).toEqual({ segundos: 1200, aberturas: 0 });
  });

  it('CA-01: evento de entrada sem saída é fechado pelo fim da janela', () => {
    const fim = ts(19, 10, 0);
    const r = agregarUsoPorDia([entra(INSTAGRAM, ts(19, 9, 30))], JANELA_INICIO, fim);
    expect(r['2026-10-19'][INSTAGRAM]).toEqual({ segundos: 1800, aberturas: 1 });
  });

  it('CA-01: saída sem entrada na janela é ignorada', () => {
    const r = agregarUsoPorDia([sai(INSTAGRAM, ts(19, 9, 0))], JANELA_INICIO, JANELA_FIM);
    expect(r).toEqual({});
  });

  it('CA-02: pacote fora da lista curada não aparece no resultado', () => {
    const eventos = [
      entra(CHROME, ts(19, 9, 0)),
      sai(CHROME, ts(19, 9, 10)),
      entra(INSTAGRAM, ts(19, 9, 10)),
      sai(INSTAGRAM, ts(19, 9, 11)),
    ];
    const r = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(Object.keys(r['2026-10-19'])).toEqual([INSTAGRAM]);
    expect(agregarUsoPorDia([entra(CHROME, ts(19, 9)), sai(CHROME, ts(19, 10))], JANELA_INICIO, JANELA_FIM)).toEqual({});
  });

  it('CA-03: agregar os mesmos eventos duas vezes devolve o mesmo resultado', () => {
    const eventos = [
      entra(INSTAGRAM, ts(18, 23, 50)),
      sai(INSTAGRAM, ts(19, 0, 20)),
      entra(TIKTOK, ts(19, 9, 0)),
    ];
    const a = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    const b = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(b).toEqual(a);
    expect(Object.keys(a).length).toBeGreaterThan(0);
  });

  it('CA-03: a ordem de chegada dos eventos não muda o resultado', () => {
    const eventos = [entra(INSTAGRAM, ts(19, 9, 0)), sai(INSTAGRAM, ts(19, 9, 10))];
    const r = agregarUsoPorDia([...eventos].reverse(), JANELA_INICIO, JANELA_FIM);
    expect(r['2026-10-19'][INSTAGRAM]).toEqual({ segundos: 600, aberturas: 1 });
  });

  it('CA-04: eventos de ontem geram a entrada do dia de ontem', () => {
    const eventos = [
      entra(TIKTOK, ts(18, 20, 0)),
      sai(TIKTOK, ts(18, 20, 10)),
      entra(LAUNCHER, ts(18, 20, 10), 'Home'),
      sai(LAUNCHER, ts(18, 21, 0), 'Home'),
      entra(TIKTOK, ts(18, 21, 0)),
      sai(TIKTOK, ts(18, 21, 5)),
    ];
    const r = agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM);
    expect(r['2026-10-18'][TIKTOK]).toEqual({ segundos: 900, aberturas: 2 });
    expect(r['2026-10-19']).toBeUndefined();
  });

  it('CA-04: eventos fora da janela não entram no resultado', () => {
    const eventos = [entra(TIKTOK, ts(5, 20, 0)), sai(TIKTOK, ts(5, 20, 10))];
    expect(agregarUsoPorDia(eventos, JANELA_INICIO, JANELA_FIM)).toEqual({});
  });
});
