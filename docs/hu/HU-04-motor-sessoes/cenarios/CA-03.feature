# language: pt
@CA-03 @feliz
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Fim da sessão avisa e inicia o cooldown de 45 minutos
    Dado que uma sessão de 15 minutos está ativa
    Quando falta 1 minuto para o fim da sessão
    Então aparece o aviso "1 minuto restante"
    Quando os 15 minutos se completam
    Então a sessão termina
    E a interceptação mostra "próximo acesso em 45 min", diminuindo com o tempo
