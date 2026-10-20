# language: pt
@CA-03 @feliz
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Religar antes do lembrete cancela a notificação
    Dado que o serviço foi desligado às 22:00
    Quando o serviço é religado às 07:00 do dia seguinte
    Então não há lembrete agendado
    E nenhuma notificação "Bloqueio de apps desligado" é exibida
