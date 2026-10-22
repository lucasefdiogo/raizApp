# language: pt
@CA-07 @excecao
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Dados insuficientes não geram a tela de confirmação
    Dado que há menos de 5 dias de dados de uso coletados
    Quando a pessoa abre o app
    Então a tela de confirmação da rotina estimada não é mostrada
