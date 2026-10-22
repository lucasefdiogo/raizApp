# language: pt
@CA-06 @excecao
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Sem rotina confirmada, não há fricção extra mesmo tarde da noite
    Dado que "rotina.confirmadoEm" não está preenchido
    Quando a pessoa abre um app bloqueado às 23h
    Então a pausa de intenção usa a sequência e o texto padrão da HU-04
    E nenhuma fricção adicional da janela noturna é aplicada
