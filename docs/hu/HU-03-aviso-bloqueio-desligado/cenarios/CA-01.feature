# language: pt
@CA-01 @feliz
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Desligar o serviço agenda o lembrete da manhã seguinte
    Dado que o usuário tem regrasBloqueio e já ativou o serviço antes
    E que notificacoesAtivas é verdadeiro
    Quando o serviço é desligado às 22:00
    Então há um lembrete agendado para as 09:00 do dia seguinte
    E o lembrete tem o título "Bloqueio de apps desligado" e o corpo "Desligado desde ontem. Toque para religar quando quiser."
