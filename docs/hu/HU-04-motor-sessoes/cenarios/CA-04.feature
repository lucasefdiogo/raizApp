# language: pt
@CA-04 @feliz
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Segunda sessão do dia tem pausa de intenção de 20s
    Dado que uma sessão já foi liberada hoje
    Quando o usuário abre um app bloqueado depois do cooldown
    Então a pausa de intenção mostra o botão desabilitado por 20 segundos
