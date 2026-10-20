import fixtures from './__fixtures__/avisoBloqueio.json';
import {
  deveExibirLembrete,
  deveRegistrarDesligamentoNaAbertura,
  horariosLembretes,
  lembretesAgendaveis,
  textoLembrete,
  UltimoEventoAcessibilidade,
} from './avisoBloqueio';

interface HoraLocal {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
}

// Fixtures describe local wall-clock times; the device time zone turns them into instants.
const emMs = (h: HoraLocal): number =>
  new Date(h.ano, h.mes - 1, h.dia, h.hora, h.minuto).getTime();

describe('avisoBloqueio — fixtures compartilhadas com o Kotlin', () => {
  describe('horariosLembretes', () => {
    it.each(fixtures.lembretes)(
      'CA-01: $nome (1º lembrete às 09:00 do dia seguinte)',
      caso => {
        const [primeiro] = horariosLembretes(emMs(caso.desligadoEm));
        expect(primeiro).toBe(emMs(caso.esperado[0].em));
      },
    );

    it.each(fixtures.lembretes)(
      'CA-02: $nome (2º lembrete 3 dias depois do 1º, sem 3º)',
      caso => {
        const horarios = horariosLembretes(emMs(caso.desligadoEm));
        expect(horarios).toHaveLength(2);
        expect(horarios[1]).toBe(emMs(caso.esperado[1].em));
      },
    );
  });

  describe('textoLembrete', () => {
    it.each(fixtures.textos)(
      'CA-01: texto do lembrete $ordem bate com a RN-04',
      caso => {
        expect(textoLembrete(caso.ordem as 1 | 2)).toEqual({
          titulo: caso.titulo,
          corpo: caso.corpo,
        });
      },
    );

    it('CA-06: nenhum texto de lembrete contém a palavra proteção', () => {
      for (const ordem of [1, 2] as const) {
        const { titulo, corpo } = textoLembrete(ordem);
        expect(`${titulo} ${corpo}`.toLowerCase()).not.toMatch(
          /prote[cç][aã]o/,
        );
      }
      // RN-09 also holds for the shared fixture texts
      expect(JSON.stringify(fixtures.textos).toLowerCase()).not.toMatch(
        /prote[cç][aã]o/,
      );
    });
  });

  describe('lembretesAgendaveis', () => {
    it.each(fixtures.agendaveis)('CA-03: $nome', caso => {
      const resultado = lembretesAgendaveis(
        emMs(caso.desligadoEm),
        caso.religadoEm ? emMs(caso.religadoEm) : null,
        emMs(caso.agora),
      );
      expect(resultado.map(l => l.ordem)).toEqual(caso.esperadoOrdens);
    });

    it('CA-03: religar antes das 09:00 do dia seguinte não deixa lembrete agendável', () => {
      const religado = fixtures.agendaveis[1];
      expect(
        lembretesAgendaveis(
          emMs(religado.desligadoEm),
          emMs(religado.religadoEm as HoraLocal),
          emMs(religado.agora),
        ),
      ).toEqual([]);
    });

    it('CA-01: desligar às 22:00 agenda o 1º lembrete para as 09:00 do dia seguinte com título e corpo da RN-04', () => {
      const caso = fixtures.agendaveis[0];
      const [primeiro] = lembretesAgendaveis(
        emMs(caso.desligadoEm),
        null,
        emMs(caso.agora),
      );
      expect(primeiro.em).toBe(
        emMs({ ano: 2026, mes: 10, dia: 12, hora: 9, minuto: 0 }),
      );
      expect(textoLembrete(primeiro.ordem)).toEqual({
        titulo: 'Bloqueio de apps desligado',
        corpo: 'Desligado desde ontem. Toque para religar quando quiser.',
      });
    });

    it('CA-02: o 2º lembrete cai três dias depois do 1º, às 09:00, e não existe um 3º', () => {
      const caso = fixtures.agendaveis[0];
      const lista = lembretesAgendaveis(
        emMs(caso.desligadoEm),
        null,
        emMs(caso.agora),
      );
      expect(lista.map(l => l.ordem)).toEqual([1, 2]);
      expect(lista[1].em).toBe(
        emMs({ ano: 2026, mes: 10, dia: 15, hora: 9, minuto: 0 }),
      );
    });
  });

  describe('deveExibirLembrete', () => {
    it.each(fixtures.exibir)('CA-06: $nome', caso => {
      expect(
        deveExibirLembrete({
          servicoDesligado: caso.servicoDesligado,
          temRegrasBloqueio: caso.temRegrasBloqueio,
          jaAtivadoAlgumaVez: caso.jaAtivadoAlgumaVez,
          notificacoesAtivas: caso.notificacoesAtivas,
        }),
      ).toBe(caso.esperado);
    });

    it('CA-06: com notificacoesAtivas falso o lembrete não é exibido', () => {
      expect(
        deveExibirLembrete({
          servicoDesligado: true,
          temRegrasBloqueio: true,
          jaAtivadoAlgumaVez: true,
          notificacoesAtivas: false,
        }),
      ).toBe(false);
    });
  });

  describe('deveRegistrarDesligamentoNaAbertura', () => {
    it.each(fixtures.registrarNaAbertura)('CA-07: $nome', caso => {
      expect(
        deveRegistrarDesligamentoNaAbertura({
          servicoDesligado: caso.servicoDesligado,
          ultimoEvento: caso.ultimoEvento as UltimoEventoAcessibilidade,
        }),
      ).toBe(caso.esperado);
    });

    it('CA-07: na abertura com o serviço desligado e sem desligamento desde o último religamento o app registra o desligamento', () => {
      expect(
        deveRegistrarDesligamentoNaAbertura({
          servicoDesligado: true,
          ultimoEvento: 'religamento',
        }),
      ).toBe(true);
      expect(
        deveRegistrarDesligamentoNaAbertura({
          servicoDesligado: true,
          ultimoEvento: null,
        }),
      ).toBe(true);
      expect(
        deveRegistrarDesligamentoNaAbertura({
          servicoDesligado: true,
          ultimoEvento: 'desligamento',
        }),
      ).toBe(false);
    });
  });
});
