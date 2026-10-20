import { agruparEventosPorDia, EventoAcessibilidade } from './acessibilidade';

// Built from local components so the test does not depend on the machine timezone.
const iso = (ano: number, mes: number, dia: number, h: number, min = 0) =>
  new Date(ano, mes - 1, dia, h, min).toISOString();

describe('agruparEventosPorDia', () => {
  it('CA-05: desligamento e religamento de dias diferentes vão cada um para o dia do evento', () => {
    const desligou = iso(2026, 10, 20, 22);
    const religou = iso(2026, 10, 21, 8);
    const eventos: EventoAcessibilidade[] = [
      { tipo: 'desligamento', em: desligou },
      { tipo: 'religamento', em: religou },
    ];

    expect(agruparEventosPorDia(eventos)).toEqual({
      '2026-10-20': { desligadoEm: [desligou], religadoEm: [] },
      '2026-10-21': { desligadoEm: [], religadoEm: [religou] },
    });
  });

  it('CA-05: o mesmo evento repetido na lista aparece uma vez só', () => {
    const desligou = iso(2026, 10, 20, 22);
    const eventos: EventoAcessibilidade[] = [
      { tipo: 'desligamento', em: desligou },
      { tipo: 'desligamento', em: desligou },
    ];

    expect(agruparEventosPorDia(eventos)).toEqual({
      '2026-10-20': { desligadoEm: [desligou], religadoEm: [] },
    });
  });

  it('CA-05: lista vazia não gera nenhum dia', () => {
    expect(agruparEventosPorDia([])).toEqual({});
  });
});
