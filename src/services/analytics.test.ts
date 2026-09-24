import {
  logAppBloqueadoDetectado,
  logAppDesbloqueado,
  logDesafioConcluido,
  logFocusSessionEnd,
  logInterceptAction,
  logInterceptShown,
  logMarcoStreakAtingido,
  logOnboardingConcluido,
  logPermissaoAccessibility,
  logPermissaoNotificacao,
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

  it('logInterceptShown envia o estado da tela', () => {
    logInterceptShown('A');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'intercept_shown',
      { estado_tela: 'A' },
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

  it('logFocusSessionEnd envia duração planejada e resultado', () => {
    logFocusSessionEnd(120, 'concluiu_tarefa');

    expect(analyticsMock.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'focus_session_end',
      { duracao_planejada: 120, resultado: 'concluiu_tarefa' },
    );
  });
});
