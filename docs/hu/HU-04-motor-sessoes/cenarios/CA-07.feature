# language: pt
@CA-07 @excecao
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Concluir uma tarefa extra libera o saldo zerado
    Dado que a interceptação está no estado de saldo zerado
    Quando o usuário conclui uma tarefa extra
    Então a próxima tentativa de abrir um app bloqueado mostra a pausa de intenção, não o saldo zerado
