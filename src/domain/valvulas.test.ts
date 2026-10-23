import { montarValvulas } from './valvulas';

describe('HU-11 · montarValvulas', () => {
  it('Cenário 10: acesso rápido disponível lidera, com a meta "{restantes} DE 3 HOJE"', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: true,
      usosAcessoRapidoHoje: 1,
      msAteProximoAcessoRapido: 0,
      emergenciaOferecida: false,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 2,
    });

    expect(valvulas.map(v => v.tipo)).toEqual([
      'acesso_rapido',
      'sessao_foco',
      'tarefas_extras',
    ]);
    expect(valvulas[0]).toMatchObject({
      titulo: 'Acesso rápido',
      descricao: '2 minutos, depois de 5s',
      meta: '2 DE 3 HOJE',
      disponivel: true,
    });
    expect(valvulas.every(v => v.titulo !== 'bloqueado')).toBe(true);
  });

  it('RN11: nenhuma válvula usa texto de negativa', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: false,
      usosAcessoRapidoHoje: 1,
      msAteProximoAcessoRapido: 8 * 60_000,
      emergenciaOferecida: true,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 0,
    });

    const textos = valvulas.flatMap(v => [v.titulo, v.descricao, v.meta]).join(' ');
    expect(textos).not.toMatch(/bloqueado|acabou|não pode/i);
  });

  it('Cenário 13: acesso rápido indisponível por intervalo revela a emergência no topo', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: false,
      usosAcessoRapidoHoje: 1,
      msAteProximoAcessoRapido: 8 * 60_000,
      emergenciaOferecida: true,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 0,
    });

    expect(valvulas.map(v => v.tipo)).toEqual([
      'emergencia',
      'acesso_rapido',
      'sessao_foco',
      'tarefas_extras',
    ]);
    expect(valvulas[0]).toMatchObject({ titulo: 'Saída de emergência', meta: 'SEM LIMITE' });
    expect(valvulas[1]).toMatchObject({
      titulo: 'Acesso rápido',
      descricao: 'Próximo disponível em 8 min',
      meta: 'EM 8 MIN',
      disponivel: false,
    });
  });

  it('Cenário 14: cota do dia esgotada mostra "Volta amanhã" e "AMANHÃ"', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: false,
      usosAcessoRapidoHoje: 3,
      msAteProximoAcessoRapido: null,
      emergenciaOferecida: true,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 0,
    });

    const acessoRapido = valvulas.find(v => v.tipo === 'acesso_rapido');
    expect(acessoRapido).toMatchObject({
      descricao: 'Volta amanhã',
      meta: 'AMANHÃ',
      disponivel: false,
    });
  });

  it('RN11: tarefas extras tem a meta omitida (vazia) quando não há pendentes', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: true,
      usosAcessoRapidoHoje: 0,
      msAteProximoAcessoRapido: 0,
      emergenciaOferecida: false,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 0,
    });

    expect(valvulas.find(v => v.tipo === 'tarefas_extras')).toMatchObject({ meta: '' });
  });

  it('RN11: tarefas extras mostra a quantidade pendente como meta', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: true,
      usosAcessoRapidoHoje: 0,
      msAteProximoAcessoRapido: 0,
      emergenciaOferecida: false,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 3,
    });

    expect(valvulas.find(v => v.tipo === 'tarefas_extras')).toMatchObject({ meta: '3' });
  });

  it('Cenário 12/RN09: dentro da janela noturna, a descrição do acesso rápido reflete os 30s', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: true,
      usosAcessoRapidoHoje: 0,
      msAteProximoAcessoRapido: 0,
      emergenciaOferecida: false,
      esperaAcessoRapidoSeg: 30,
      tarefasExtrasPendentes: 0,
    });

    expect(valvulas[0]).toMatchObject({ descricao: '2 minutos, depois de 30s' });
  });

  it('sem acesso rápido disponível e sem emergência oferecida, a lista não traz emergência', () => {
    const valvulas = montarValvulas({
      acessoRapidoDisponivel: false,
      usosAcessoRapidoHoje: 1,
      msAteProximoAcessoRapido: 5 * 60_000,
      emergenciaOferecida: false,
      esperaAcessoRapidoSeg: 5,
      tarefasExtrasPendentes: 0,
    });

    expect(valvulas.map(v => v.tipo)).toEqual([
      'acesso_rapido',
      'sessao_foco',
      'tarefas_extras',
    ]);
  });
});
