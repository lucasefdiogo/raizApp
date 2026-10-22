# language: pt
@CA-01 @feliz
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Rotina estimada com dados suficientes mostra a tela de confirmação
    Dado que há 5 dias de dados de uso coletados
    E que "rotina.confirmadoEm" não está preenchido
    Quando a pessoa abre o app
    Então a tela de confirmação da rotina é mostrada
    E o horário estimado de dormir aparece na tela
