import {
  logAcessibilidadeSaibaMais,
  logAppBloqueadoDetectado,
  logAppDesbloqueado,
  logDesafioConcluido,
  logFocusSessionEnd,
  logInterceptAction,
  logInterceptShown,
  logMarcoStreakAtingido,
  logOnboardingConcluido,
  logAlternativaEscolhida,
  logAlternativaNoturnaRespondida,
  logPermissaoAccessibility,
  logPermissaoNotificacao,
  logReflexaoSemanalExibida,
  logReflexaoSemanalFechada,
  logRotinaConfirmada,
  logRotinaRecalculoPedido,
  logValvulaEscolhida,
  logTarefaConcluida,
  logTarefaCriada,
  logTourFuncionalidadesConcluido,
  logTourFuncionalidadesPulado,
  logTravadoAberto,
  logTravadoEstado,
  logTutorialConcluido,
} from './analytics';

const analyticsMock = require('@react-native-firebase/analytics');

describe('services/analytics', () => {
  beforeEach(() => {
    analyticsMock.__reset();
  });

  it('logTarefaCriada envia o evento com essencial e tipo', () => {
    logTarefaCriada(true, 'padrao');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'tarefa_criada',
      { essencial: true, tipo: 'padrao' },
    );
  });

  it('logTarefaConcluida envia o evento com essencial e tipo', () => {
    logTarefaConcluida(false, 'exercicio');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'tarefa_concluida',
      { essencial: false, tipo: 'exercicio' },
    );
  });

  it('logMarcoStreakAtingido envia o marco', () => {
    logMarcoStreakAtingido(7);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'marco_streak_atingido',
      { marco: 7 },
    );
  });

  it('logAppBloqueadoDetectado envia o evento sem parâmetros', () => {
    logAppBloqueadoDetectado();

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'app_bloqueado_detectado',
    );
  });

  it('logAppDesbloqueado envia método e nível', () => {
    logAppDesbloqueado('respiracao', 2);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'app_desbloqueado',
      { metodo: 'respiracao', nivel: 2 },
    );
  });

  it('logDesafioConcluido envia o tipo', () => {
    logDesafioConcluido('exercicio_3x');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'desafio_concluido',
      { tipo: 'exercicio_3x' },
    );
  });

  it('logOnboardingConcluido envia o evento sem parâmetros', () => {
    logOnboardingConcluido();

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'onboarding_concluido',
    );
  });

  it('logTutorialConcluido envia o evento sem parâmetros', () => {
    logTutorialConcluido();

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'tutorial_concluido',
    );
  });

  it('logTourFuncionalidadesConcluido envia o evento sem parâmetros', () => {
    logTourFuncionalidadesConcluido();

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'tour_funcionalidades_concluido',
    );
  });

  it('logTourFuncionalidadesPulado envia o passo em que pulou', () => {
    logTourFuncionalidadesPulado(2);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'tour_funcionalidades_pulado',
      { passo: 2 },
    );
  });

  it('logPermissaoAccessibility envia se foi concedida', () => {
    logPermissaoAccessibility(true);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'permissao_accessibility',
      { concedida: true },
    );
  });

  it('logPermissaoNotificacao envia se foi concedida', () => {
    logPermissaoNotificacao(false);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'permissao_notificacao',
      { concedida: false },
    );
  });

  it('logTravadoAberto envia a origem', () => {
    logTravadoAberto('travado');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'travado_opened',
      { origem: 'travado' },
    );
  });

  it('logTravadoEstado envia o estado', () => {
    logTravadoEstado('confusao');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'travado_state',
      { estado: 'confusao' },
    );
  });

  it('logInterceptShown envia o estado da tela, a janela noturna e a alternativa', () => {
    logInterceptShown('A', true, 'noturna');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'intercept_shown',
      { estado_tela: 'A', janela_noturna: true, alternativa: 'noturna' },
    );
  });

  it('logInterceptAction envia a ação', () => {
    logInterceptAction('liberou');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'intercept_action',
      { acao: 'liberou' },
    );
  });

  it('logAcessibilidadeSaibaMais envia origem e status', () => {
    logAcessibilidadeSaibaMais('link', 'ativo');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'acessibilidade_saiba_mais',
      { origem: 'link', status: 'ativo' },
    );
  });

  it('logFocusSessionEnd envia duração planejada e resultado', () => {
    logFocusSessionEnd(120, 'concluiu_tarefa');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'focus_session_end',
      { duracao_planejada: 120, resultado: 'concluiu_tarefa' },
    );
  });

  it('logReflexaoSemanalExibida envia o evento sem parâmetros', () => {
    logReflexaoSemanalExibida();

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'reflexao_semanal_exibida',
    );
  });

  it('Cenário 13: logReflexaoSemanalFechada envia só a ação, sem dado de uso/app/intenção', () => {
    logReflexaoSemanalFechada('entendi');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'reflexao_semanal_fechada',
      { acao: 'entendi' },
    );
  });

  it('logReflexaoSemanalFechada aceita "agora_nao"', () => {
    logReflexaoSemanalFechada('agora_nao');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'reflexao_semanal_fechada',
      { acao: 'agora_nao' },
    );
  });

  it('HU-10 RN18/Cenário 17: logRotinaConfirmada envia só "ajustado", sem horário', () => {
    logRotinaConfirmada(true);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'rotina_confirmada',
      { ajustado: true },
    );
  });

  it('HU-10 RN18: logAlternativaNoturnaRespondida envia só a ação, sem o texto', () => {
    logAlternativaNoturnaRespondida('salvou');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'alternativa_noturna_respondida',
      { acao: 'salvou' },
    );
  });

  it('HU-10 RN18: logRotinaRecalculoPedido envia o evento sem parâmetros', () => {
    logRotinaRecalculoPedido();

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'rotina_recalculo_pedido',
    );
  });

  it('HU-11 Cenário 19: logValvulaEscolhida envia tipo e janela_noturna, sem intenção/alternativa/horário', () => {
    logValvulaEscolhida('acesso_rapido', true);

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'valvula_escolhida',
      { tipo: 'acesso_rapido', janela_noturna: true },
    );
  });

  it('logAlternativaEscolhida envia tipo e tela', () => {
    logAlternativaEscolhida('tarefa_essencial', 'pausa');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'alternativa_escolhida',
      { tipo: 'tarefa_essencial', tela: 'pausa' },
    );
  });
});
