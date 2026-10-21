# language: pt
@CA-06 @excecao
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Saldo zerado com limite configurado não bloqueia até amanhã
    Dado que blocosDiarios está configurado como 2
    E que as 2 sessões do dia já foram usadas
    Quando o usuário abre um app bloqueado
    Então a interceptação mostra a tela de saldo zerado
    E oferece os atalhos de sessão de foco e de tarefas extras
    E não mostra a pausa de intenção
