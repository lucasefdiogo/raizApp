# language: pt
@CA-03 @feliz
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Alternativa noturna cadastrada aparece na pausa de intenção noturna
    Dado que a pessoa respondeu a pergunta da alternativa noturna com um texto
    E que "rotina.alternativaNoturna" foi gravado
    Quando a pessoa abre um app bloqueado dentro da janela noturna
    Então a pausa de intenção mostra um botão com o texto da alternativa noturna
