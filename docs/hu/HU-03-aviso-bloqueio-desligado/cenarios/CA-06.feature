# language: pt
@CA-06 @excecao
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Notificações desligadas no app impedem o lembrete
    Dado que notificacoesAtivas é falso
    Quando o serviço é desligado e chegam as 09:00 do dia seguinte
    Então nenhuma notificação "Bloqueio de apps desligado" é exibida
    E o desligamento fica registrado localmente
