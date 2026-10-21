# language: pt
@CA-01 @feliz
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Primeira tentativa do dia mostra a pausa de intenção de 10s
    Dado que nenhuma sessão foi liberada hoje
    E que o horário atual está dentro da janela de bloqueio configurada
    Quando o usuário abre um app bloqueado
    Então a interceptação mostra a pausa de intenção
    E o botão "Liberar" fica desabilitado por 10 segundos
