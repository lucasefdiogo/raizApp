# language: pt
@CA-05 @feliz
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Mensagens noturnas não repetem em sequência no mesmo dia
    Dado que o horário atual está dentro da janela noturna
    E que a pessoa já abriu um app bloqueado uma vez hoje dentro da janela, recebendo uma mensagem do banco "noturno"
    Quando a pessoa abre um app bloqueado de novo, dentro da janela noturna, no mesmo dia
    Então a mensagem mostrada é diferente da mensagem da vez anterior
