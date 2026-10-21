# language: pt
@CA-06 @excecao
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Emergência não aparece com acesso rápido disponível
    Dado que a cota de acesso rápido do dia está disponível
    Quando o usuário abre um app bloqueado fora de uma sessão
    Então a tela não mostra a saída de emergência
