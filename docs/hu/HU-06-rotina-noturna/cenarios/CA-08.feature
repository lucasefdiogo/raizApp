# language: pt
@CA-08 @excecao
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Edição manual do horário trava o modo manual
    Dado que a pessoa edita manualmente o horário de dormir na tela de Perfil
    Quando a edição é salva
    Então "rotina.modoManual" é gravado como verdadeiro
    E uma nova estimativa automática não sobrescreve esse horário enquanto "rotina.modoManual" for verdadeiro
