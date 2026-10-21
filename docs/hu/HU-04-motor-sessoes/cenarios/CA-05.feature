# language: pt
@CA-05 @feliz
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Sem limite diário, a sexta sessão do dia é oferecida normalmente
    Dado que blocosDiarios não está configurado
    E que 5 sessões já foram usadas hoje
    Quando o cooldown da 5ª sessão termina
    Então a interceptação oferece uma nova sessão
    E a pausa de intenção mostra o botão desabilitado por 60 segundos
