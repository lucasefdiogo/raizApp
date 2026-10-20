# language: pt
@CA-07 @excecao
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Serviço encerrado sem onUnbind é detectado na abertura
    Dado que o serviço está desligado sem desligamento registrado desde o último religamento
    Quando o usuário abre o app
    Então um desligamento é registrado com o horário da abertura
    E há um lembrete agendado para as 09:00 do dia seguinte
