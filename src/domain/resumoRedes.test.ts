import {
  appsPorTempoDesc,
  detalheRedesDoDia,
  diasComUsoApps,
  formatarDuracao,
  montarResumoCard,
  reflexaoSemanal,
  segundosPorNomeApp,
  segundosPorNomeAppBloqueados,
  somarAberturasRedes,
  somarContadoresBloqueio,
  somarSegundosBloqueados,
  somarSegundosRedes,
  textoComparacao,
} from './resumoRedes';
import { UsoApps } from './types';

// Segunda-feira real (14/out/2026) — mesma semana usada nos cenários da HU.
const SEGUNDA = new Date(2026, 9, 19);

describe('HU-08 · Tempo nas redes e reflexão da semana', () => {
  describe('formatarDuracao (RN05)', () => {
    it('semana sem nenhum uso medido: "0 min"', () => {
      expect(formatarDuracao(0)).toBe('0 min');
    });

    it('menos de 1 minuto: "menos de 1 min"', () => {
      expect(formatarDuracao(30)).toBe('menos de 1 min');
    });

    it('só minutos: "52 min"', () => {
      expect(formatarDuracao(52 * 60)).toBe('52 min');
    });

    it('hora cheia, sem minutos: "1h"', () => {
      expect(formatarDuracao(60 * 60)).toBe('1h');
    });

    it('horas e minutos arredondados pra baixo: "6h 40min"', () => {
      expect(formatarDuracao(6 * 3600 + 40 * 60 + 59)).toBe('6h 40min');
    });
  });

  describe('somarContadoresBloqueio (RN02)', () => {
    it('soma sessões/acessos rápidos/emergências, dia ausente conta como zero', () => {
      const contadores = somarContadoresBloqueio([
        { resumoBloqueio: { sessoesUsadas: 3, intencoes: [], acessosRapidos: 2, emergencias: 1 } },
        {},
        { resumoBloqueio: { sessoesUsadas: 1, intencoes: [] } },
      ]);
      expect(contadores).toEqual({ sessoesUsadas: 4, acessosRapidos: 2, emergencias: 1 });
    });
  });

  describe('somarSegundosRedes (RN02, RN14)', () => {
    it('soma só pacotes da lista curada, ignorando chaves de horário irmãs no mesmo mapa', () => {
      const usoApps = {
        'com.instagram.android': { segundos: 100, aberturas: 2 },
        'com.whatsapp': { segundos: 999, aberturas: 99 },
        primeiroUsoDia: '2026-10-19T08:00:00',
        ultimoUsoAntesPausaLonga: '2026-10-19T22:00:00',
      } as unknown as UsoApps;

      expect(somarSegundosRedes([{ usoApps }])).toBe(100);
    });

    it('log sem usoApps conta como zero', () => {
      expect(somarSegundosRedes([{}])).toBe(0);
    });
  });

  describe('somarAberturasRedes (RN10)', () => {
    it('soma aberturas só dos pacotes curados', () => {
      const usoApps: UsoApps = {
        'com.instagram.android': { segundos: 100, aberturas: 3 },
        'com.zhiliaoapp.musically': { segundos: 50, aberturas: 2 },
      };
      expect(somarAberturasRedes([{ usoApps }])).toBe(5);
    });
  });

  describe('segundosPorNomeApp / appsPorTempoDesc (RN08)', () => {
    it('Cenário 7: agrupa os 2 pacotes do TikTok e soma Instagram, ordenado do maior pro menor', () => {
      const usoApps: UsoApps = {
        'com.zhiliaoapp.musically': { segundos: 15 * 60, aberturas: 1 },
        'com.ss.android.ugc.trill': { segundos: 15 * 60, aberturas: 1 },
        'com.instagram.android': { segundos: 20 * 60, aberturas: 1 },
      };
      const porNome = segundosPorNomeApp([{ usoApps }]);
      expect(porNome).toEqual({ TikTok: 30 * 60, Instagram: 20 * 60 });
      expect(appsPorTempoDesc(porNome)).toEqual([
        { nome: 'TikTok', segundos: 30 * 60 },
        { nome: 'Instagram', segundos: 20 * 60 },
      ]);
    });
  });

  describe('textoComparacao (RN06)', () => {
    it('Cenário 4: alta sai na mesma cor neutra, sem adjetivo', () => {
      expect(textoComparacao(6 * 3600 + 40 * 60, 6 * 3600, 5)).toBe(
        '40 min a mais que a semana passada',
      );
    });

    it('Cenário 5: diferença pequena (menos de 5 min) é "quase igual"', () => {
      expect(textoComparacao(6 * 3600, 6 * 3600 + 2 * 60, 6)).toBe(
        'Quase igual à semana passada',
      );
    });

    it('Cenário 6: sem base de 4 dias na semana anterior, não compara', () => {
      expect(textoComparacao(6 * 3600, 6 * 3600, 2)).toBeNull();
    });

    it('queda: "a menos que a semana passada"', () => {
      expect(textoComparacao(5 * 3600, 6 * 3600 + 10 * 60, 4)).toBe(
        '1h 10min a menos que a semana passada',
      );
    });
  });

  describe('diasComUsoApps (RN06, RN10)', () => {
    it('conta só dias com o campo usoApps presente', () => {
      expect(
        diasComUsoApps([{ usoApps: {} }, {}, { usoApps: { 'com.instagram.android': { segundos: 1, aberturas: 1 } } }]),
      ).toBe(2);
    });
  });

  describe('montarResumoCard', () => {
    const semanaAtual = [
      { data: '2026-10-19', resumoBloqueio: { sessoesUsadas: 5, intencoes: [], acessosRapidos: 1, emergencias: 0 }, usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 2 } } },
      { data: '2026-10-20', resumoBloqueio: { sessoesUsadas: 4, intencoes: [], acessosRapidos: 1, emergencias: 1 }, usoApps: { 'com.instagram.android': { segundos: 4000, aberturas: 2 } } },
      { data: '2026-10-21', resumoBloqueio: { sessoesUsadas: 9, intencoes: [], acessosRapidos: 3, emergencias: 0 }, usoApps: { 'com.instagram.android': { segundos: 16400, aberturas: 2 } } },
    ];
    const semanaAnteriorComBase = Array.from({ length: 5 }, () => ({
      usoApps: { 'com.instagram.android': { segundos: 24000 / 5, aberturas: 1 } },
    }));

    it('Cenário 1: com acesso de uso, soma contadores/duração e devolve 7 barras com "hoje" marcado', () => {
      const resumo = montarResumoCard(semanaAtual, semanaAnteriorComBase, true, SEGUNDA, [
        'com.instagram.android',
      ]);

      expect(resumo.contadores).toEqual({ sessoesUsadas: 18, acessosRapidos: 5, emergencias: 1 });
      expect(resumo.duracaoTotal).toBe('6h 40min');
      expect(resumo.barras).toHaveLength(7);
      expect(resumo.barras.filter(b => b.hoje)).toEqual([
        { data: '2026-10-19', segundos: 3600, hoje: true },
      ]);
      expect(resumo.barras[5]).toEqual({ data: '2026-10-24', segundos: null, hoje: false });
    });

    it('Cenário 2: sem acesso de uso, contadores aparecem mas nenhum dado de uso é lido', () => {
      const resumo = montarResumoCard(semanaAtual, semanaAnteriorComBase, false, SEGUNDA, [
        'com.instagram.android',
      ]);

      expect(resumo.contadores).toEqual({ sessoesUsadas: 18, acessosRapidos: 5, emergencias: 1 });
      expect(resumo.duracaoTotal).toBe('');
      expect(resumo.barras).toEqual([]);
      expect(resumo.comparacao).toBeNull();
      expect(resumo.listaPorApp).toBeNull();
    });
  });

  describe('detalheRedesDoDia (RN07, RN09)', () => {
    it('Cenário 7: apps somados por nome no detalhe do dia', () => {
      const detalhe = detalheRedesDoDia(
        {
          resumoBloqueio: { sessoesUsadas: 4, intencoes: [], acessosRapidos: 1 },
          usoApps: {
            'com.zhiliaoapp.musically': { segundos: 15 * 60, aberturas: 1 },
            'com.ss.android.ugc.trill': { segundos: 15 * 60, aberturas: 1 },
            'com.instagram.android': { segundos: 20 * 60, aberturas: 1 },
          },
        },
        true,
        ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.instagram.android'],
      );

      expect(detalhe?.topAppsTexto).toBe('TikTok 30 min · Instagram 20 min');
    });

    it('Cenário 8: intenções no detalhe do dia, vazias ignoradas', () => {
      const detalhe = detalheRedesDoDia(
        {
          resumoBloqueio: {
            sessoesUsadas: 4,
            intencoes: ['responder a turma', '', 'ver o story da Bia'],
          },
        },
        true,
        [],
      );

      expect(detalhe?.intencoes).toEqual(['responder a turma', 'ver o story da Bia']);
      expect(detalhe?.intencoesExcedente).toBe(0);
    });

    it('intenções acima de 5 mostram o excedente', () => {
      const detalhe = detalheRedesDoDia(
        {
          resumoBloqueio: {
            sessoesUsadas: 1,
            intencoes: ['a', 'b', 'c', 'd', 'e', 'f', '  '],
          },
        },
        true,
        [],
      );

      expect(detalhe?.intencoes).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(detalhe?.intencoesExcedente).toBe(1);
    });

    it('Cenário 9: dia sem resumoBloqueio nem usoApps não mostra o bloco', () => {
      expect(detalheRedesDoDia({}, true, [])).toBeNull();
      expect(detalheRedesDoDia(null, true, [])).toBeNull();
    });

    it('sem acesso de uso, não mostra duração nem apps mesmo que usoApps exista', () => {
      const detalhe = detalheRedesDoDia(
        {
          resumoBloqueio: { sessoesUsadas: 1, intencoes: [] },
          usoApps: { 'com.instagram.android': { segundos: 100, aberturas: 1 } },
        },
        false,
        ['com.instagram.android'],
      );

      expect(detalhe?.duracao).toBeNull();
      expect(detalhe?.topAppsTexto).toBeNull();
    });
  });

  describe('HU-13 · Histórico só dos apps bloqueados', () => {
    describe('somarSegundosBloqueados / segundosPorNomeAppBloqueados', () => {
      const usoApps = {
        'com.instagram.android': { segundos: 100, aberturas: 2 },
        'com.zhiliaoapp.musically': { segundos: 50, aberturas: 1 },
        'com.google.android.youtube': { segundos: 999, aberturas: 5 },
      };

      it('soma só os pacotes bloqueados, ignorando apps da lista curada que não estão bloqueados', () => {
        expect(somarSegundosBloqueados([{ usoApps }], ['com.instagram.android'])).toBe(100);
      });

      it('sem nenhum app bloqueado, soma zero mesmo havendo uso registrado', () => {
        expect(somarSegundosBloqueados([{ usoApps }], [])).toBe(0);
      });

      it('agrupa por nome só os pacotes bloqueados', () => {
        expect(
          segundosPorNomeAppBloqueados([{ usoApps }], ['com.instagram.android', 'com.zhiliaoapp.musically']),
        ).toEqual({ Instagram: 100, TikTok: 50 });
      });
    });

    describe('montarResumoCard', () => {
      const semanaAtual = [
        {
          data: '2026-10-19',
          resumoBloqueio: { sessoesUsadas: 1, intencoes: [] },
          usoApps: {
            'com.instagram.android': { segundos: 4 * 3600 + 10 * 60, aberturas: 2 },
            'com.zhiliaoapp.musically': { segundos: 2 * 3600 + 30 * 60, aberturas: 2 },
            'com.google.android.youtube': { segundos: 10 * 3600, aberturas: 10 },
          },
        },
      ];

      it('Cenário 1: soma só os apps bloqueados, YouTube desmarcado não entra no total', () => {
        const resumo = montarResumoCard(semanaAtual, [], true, SEGUNDA, [
          'com.instagram.android',
          'com.zhiliaoapp.musically',
        ]);

        expect(resumo.duracaoTotal).toBe('6h 40min');
      });

      it('Cenário 2: lista por app ordenada do maior pro menor tempo', () => {
        const resumo = montarResumoCard(semanaAtual, [], true, SEGUNDA, [
          'com.instagram.android',
          'com.zhiliaoapp.musically',
        ]);

        expect(resumo.listaPorApp).toBe('Instagram 4h 10min · TikTok 2h 30min');
      });

      it('Cenário 3: um único app bloqueado não mostra a lista por app', () => {
        const resumo = montarResumoCard(semanaAtual, [], true, SEGUNDA, ['com.instagram.android']);

        expect(resumo.listaPorApp).toBeNull();
      });

      it('Cenário 5: nenhum app bloqueado usa o mesmo estado de "sem acesso de uso"', () => {
        // O hook (useResumoRedes) é quem decide comAcessoDeUso combinando
        // consentimento + apps bloqueados — aqui simulamos o resultado já
        // combinado (false), que é o que RN06 pede.
        const resumo = montarResumoCard(semanaAtual, [], false, SEGUNDA, []);

        expect(resumo.duracaoTotal).toBe('');
        expect(resumo.barras).toEqual([]);
        expect(resumo.listaPorApp).toBeNull();
      });
    });

    describe('detalheRedesDoDia', () => {
      const logDoDia = {
        resumoBloqueio: { sessoesUsadas: 2, intencoes: [] },
        usoApps: {
          'com.instagram.android': { segundos: 20 * 60, aberturas: 1 },
          'com.zhiliaoapp.musically': { segundos: 15 * 60, aberturas: 1 },
          'com.google.android.youtube': { segundos: 999 * 60, aberturas: 1 },
        },
      };

      it('Cenário 1: YouTube desmarcado não entra na duração nem na lista de apps', () => {
        const detalhe = detalheRedesDoDia(logDoDia, true, [
          'com.instagram.android',
          'com.zhiliaoapp.musically',
        ]);

        expect(detalhe?.duracao).toBe('35 min');
        expect(detalhe?.topAppsTexto).toBe('Instagram 20 min · TikTok 15 min');
      });

      it('Cenário 6: sem teto de 2 apps — lista os 3 apps bloqueados com uso no dia', () => {
        const detalhe = detalheRedesDoDia(
          {
            resumoBloqueio: { sessoesUsadas: 1, intencoes: [] },
            usoApps: {
              'com.instagram.android': { segundos: 30 * 60, aberturas: 1 },
              'com.zhiliaoapp.musically': { segundos: 20 * 60, aberturas: 1 },
              'com.pinterest': { segundos: 10 * 60, aberturas: 1 },
            },
          },
          true,
          ['com.instagram.android', 'com.zhiliaoapp.musically', 'com.pinterest'],
        );

        expect(detalhe?.topAppsTexto).toBe('Instagram 30 min · TikTok 20 min · Pinterest 10 min');
      });
    });
  });

  describe('reflexaoSemanal (RN10)', () => {
    const semanaAnteriorComBase = [
      { data: '2026-10-12', usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 3 } } },
      { data: '2026-10-13', usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 3 } } },
      { data: '2026-10-14', usoApps: { 'com.instagram.android': { segundos: 3600 * 3, aberturas: 10 } } },
      { data: '2026-10-15', usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 3 } } },
      { data: '2026-10-16', usoApps: { 'com.instagram.android': { segundos: 0, aberturas: 0 } } },
    ];

    it('Cenário 10/12: com base de 4+ dias, devolve período, total, app principal, média, dia mais longo e aberturas — sem proposta de desafio', () => {
      const dados = reflexaoSemanal(semanaAnteriorComBase, SEGUNDA);

      expect(dados).not.toBeNull();
      expect(dados?.periodoLabel).toBe('Semana de 12 a 18 de out');
      expect(dados?.duracaoTotal).toBe('6h');
      expect(dados?.appPrincipalTexto).toBe('O Instagram ficou com mais da metade.');
      expect(dados?.diaMaisLongoAbreviado).toBe('qua');
      expect(dados?.totalAberturas).toBe(19);
      expect(dados).not.toHaveProperty('desafio');
      expect(dados).not.toHaveProperty('proposta');
    });

    it('Cenário 11: sem base de 4 dias, não mostra a reflexão', () => {
      expect(reflexaoSemanal(semanaAnteriorComBase.slice(0, 3), SEGUNDA)).toBeNull();
    });
  });
});
