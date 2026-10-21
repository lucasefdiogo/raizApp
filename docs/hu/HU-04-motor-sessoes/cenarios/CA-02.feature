# language: pt
@CA-02 @feliz
Funcionalidade: Motor de sessões sem liberação por tarefa
  Cenário: Sessão só conta tempo com o app em primeiro plano
    Dado que o usuário liberou a pausa de intenção
    Quando a sessão de 15 minutos está ativa
    E o usuário apaga a tela por 2 minutos e volta
    Então o tempo restante da sessão não avançou durante os 2 minutos com a tela apagada
