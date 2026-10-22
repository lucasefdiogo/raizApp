# language: pt
@CA-02 @feliz
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Confirmar a rotina estimada leva à pergunta da alternativa noturna
    Dado que a tela de confirmação da rotina estimada está sendo exibida
    Quando a pessoa toca em "Confirmar"
    Então "rotina.confirmadoEm" é gravado
    E a tela da pergunta sobre a alternativa noturna é mostrada em seguida
