# language: pt
@CA-07 @excecao
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Usar a emergência não consome a cota do acesso rápido
    Dado que a cota de acesso rápido do dia está disponível
    Quando o usuário usa a saída de emergência
    Então a cota de acesso rápido do dia continua disponível e inalterada
