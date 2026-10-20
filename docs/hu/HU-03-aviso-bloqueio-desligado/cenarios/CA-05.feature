# language: pt
@CA-05 @feliz
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Eventos do serviço são sincronizados sem duplicar
    Dado que o serviço foi desligado em 2026-10-20T22:00 e religado em 2026-10-21T08:00 com o app fechado
    Quando o usuário abre o app
    Então dailyLogs de 2026-10-20 tem acessibilidade.desligadoEm contendo o horário do desligamento
    E dailyLogs de 2026-10-21 tem acessibilidade.religadoEm contendo o horário do religamento
    E abrir o app de novo não adiciona outro item a esses arrays
